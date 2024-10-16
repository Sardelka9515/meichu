from django.http.request import HttpRequest
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import *
import pathlib
import gradio as gr
import cv2
import shutil
import uuid
from transformers import pipeline
from django.core.files.storage import FileSystemStorage
import yt_dlp
from .models import *
import threading
from typing import List

pipe = pipeline("image-classification", "umm-maybe/AI-image-detector")

# Clear all files in upload directory
shutil.rmtree('uploads', ignore_errors=True)

def classify_image(image):
    outputs = pipe(image)
    results = {}
    for result in outputs:
        results[result['label']] = result['score']
    return results

def extract_frames(video_path, sampleCount:int, out_dir)->List[str]:
    vidcap = cv2.VideoCapture(video_path)
    length = int(vidcap.get(cv2.CAP_PROP_FRAME_COUNT))
    gap = int(length / sampleCount) if length > sampleCount else 1
    success,image = vidcap.read()
    images = []
    # create output directory if it doesn't exist
    pathlib.Path(out_dir).mkdir(parents=True, exist_ok=True)

    if gap == 1:    
        count = 0
        while success:
            imgPath = f"{out_dir}/{count}.jpg"
            cv2.imwrite(imgPath , image)     # save frame as JPEG file
            images.append(imgPath)
            success,image = vidcap.read()
            print('\rExtracted frame: ',count,'/',length,", ", success,end='')
            count += 1
    else:
        for i in range(sampleCount):
            vidcap.set(cv2.CAP_PROP_POS_FRAMES, i * gap)
            success,image = vidcap.read()
            imgPath = f"{out_dir}/{i}.jpg"
            cv2.imwrite(imgPath , image)
            images.append(imgPath)
            print('\rExtracted frame: ',i * gap,'/',length,", ", success,end='')
        
    vidcap.release()
    return images

def classify_video(images:List[str])->List[List]:
    results = []
    for imgPath in images:
        print('classifying '+ imgPath)
        result = classify_image(imgPath)
        result['image'] = imgPath
        results.append(result)
        print(result)

    return results


def download_video(url: str, id: str,task:VideoTask) -> str:

    # Set options for yt-dlp
    ydl_opts = {
        'outtmpl': f'uploads/{task.id}.%(ext)s',  # Save to 'uploads' directory with title as filename
    }
    
    # Use yt-dlp to download video to uploads directory and get info
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info_dict = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info_dict)
        return filename

def video_analyzer(task:VideoTask) -> None:
    tmpDir = f'uploads/{task.id}'

    task.status = 'downloading'
    path = download_video(task.url, task.id, task)

    task.status = 'extracting'
    images = extract_frames(path, 20, tmpDir)
    
    task.status = 'analyzing'
    task.results = classify_video(images)
    return

video_tasks = {}

@api_view(['POST'])
def analyze_video(request:HttpRequest) -> Response:
    task = VideoTask()
    task.id=uuid.uuid4().__str__()
    task.url=request.data['url']
    task.status='downloading'
    task.results=[]
    task.progress=0.0
    task.thread = threading.Thread(target=video_analyzer, args=(task,))
    video_tasks[task.id] = task
    task.thread.start()
    task.thread.join()
    return Response(task.results, status.HTTP_200_OK)

@api_view(['POST'])
def analyze_image(request:HttpRequest) -> Response:
    img = request.FILES["image"]
    fs = FileSystemStorage('uploads')
    fileName = uuid.uuid4().__str__()
    fileName += pathlib.Path(img.name).suffix
    file = fs.save(fileName,img)
    data = classify_image(f'uploads/{fileName}')
    fs.delete(fileName)
    return Response(data, status.HTTP_200_OK)
