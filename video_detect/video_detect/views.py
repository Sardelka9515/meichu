from django.http.request import HttpRequest
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import *
from .serialier import *
import pathlib
import gradio as gr
import cv2
import shutil
import uuid
from transformers import pipeline
from django.core.files.storage import FileSystemStorage

pipe = pipeline("image-classification", "umm-maybe/AI-image-detector")
VideoAnalysis.objects.all().delete()
ImageAnalysis.objects.all().delete()

def image_classifier(image):
    outputs = pipe(image)
    results = {}
    for result in outputs:
        results[result['label']] = result['score']
    return results

def video_classifier(path:str, sampleCount:int,outDir: str):
    
    vidcap = cv2.VideoCapture(path)
    length = int(vidcap.get(cv2.CAP_PROP_FRAME_COUNT))
    gap = int(length / sampleCount)
    success,image = vidcap.read()
    images = []
    count = 0
    while success:
        if count % gap == 0:
            imgPath = f"{outDir}/{count}.jpg"
            cv2.imwrite(imgPath , image)     # save frame as JPEG file
            images.append(imgPath)
        success,image = vidcap.read()
        
        print('\rRead frame: ',count,'/',length,", ", success,end='')
        count += 1
    vidcap.release()

    for imgPath in images:
        print('classifying '+ imgPath)
        print(image_classifier(imgPath))


    return

    
@api_view(['POST'])
def analyze_image(request:HttpRequest) -> Response:
    img = request.FILES["image"]
    fs = FileSystemStorage('uploads')
    fileName = uuid.uuid4().__str__()
    fileName += pathlib.Path(img.name).suffix
    file = fs.save(fileName,img)
    data = image_classifier(f'uploads/{fileName}')
    fs.delete(fileName)
    return Response(data, status.HTTP_200_OK)


@api_view(['POST'])
def analyze_video(request:HttpRequest) -> Response:
    sr = VideoAnalysisSerializer(data = request.data)
    print(request.data['id'])
    if sr.is_valid():
        sr.save()
        vidTask = sr.validated_data
        print(vidTask)
        return Response(vidTask, status.HTTP_200_OK)
    else:
        return Response(sr.errors, status.HTTP_400_BAD_REQUEST)
