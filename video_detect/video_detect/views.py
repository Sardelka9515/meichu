import time
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

video_tasks_lock = threading.Lock()
pipe = pipeline("image-classification", "umm-maybe/AI-image-detector")

# Clear all files in upload directory
shutil.rmtree('uploads', ignore_errors=True)


def classify_image(image):
    outputs = pipe(image)
    results = {}
    for result in outputs:
        results[result['label']] = result['score']
    return results


def extract_frames(video_path, sampleCount: int, out_dir, task: VideoTask) -> List[str]:
    vidcap = cv2.VideoCapture(video_path)
    length = int(vidcap.get(cv2.CAP_PROP_FRAME_COUNT))
    gap = int(length / sampleCount) if length > sampleCount else 1
    success, image = vidcap.read()
    images = []
    # create output directory if it doesn't exist
    pathlib.Path(out_dir).mkdir(parents=True, exist_ok=True)

    if gap == 1:
        count = 0
        while success:
            imgPath = f"{out_dir}/{count}.jpg"
            cv2.imwrite(imgPath, image)     # save frame as JPEG file
            images.append(imgPath)
            success, image = vidcap.read()
            print('\rExtracted frame: ', count, '/',
                  length, ", ", success, end='')
            count += 1
            task.progress = count/length
    else:
        for i in range(sampleCount):
            vidcap.set(cv2.CAP_PROP_POS_FRAMES, i * gap)
            success, image = vidcap.read()
            imgPath = f"{out_dir}/{i}.jpg"
            cv2.imwrite(imgPath, image)
            images.append(imgPath)
            print('\rExtracted frame: ', i * gap,
                  '/', length, ", ", success, end='')
            task.progress = i * gap/length

    vidcap.release()
    return images


def classify_video(images: List[str], task: VideoTask) -> List[List]:
    results = []
    analyzed = 0.0
    total = len(images)
    for imgPath in images:
        print('classifying ' + imgPath)
        result = classify_image(imgPath)
        result['image'] = '/' + imgPath
        results.append(result)
        print(result)
        analyzed += 1
        task.progress = analyzed/total

    return results


def download_video(url: str, id: str, task: VideoTask) -> str:

    def progress_hook(d):
        if d['status'] == 'downloading' and 'downloaded_bytes' in d and 'total_bytes_estimate' in d:
            task.progress = d['downloaded_bytes'] / d['total_bytes_estimate']

    # Set options for yt-dlp
    ydl_opts = {
        # Save to 'uploads' directory with title as filename
        'outtmpl': f'uploads/{task.id}.%(ext)s',
        'progress_hooks': [progress_hook],
    }

    # Use yt-dlp to download video to uploads directory and get info
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info_dict = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info_dict)
        return filename


def video_analyzer(task: VideoTask) -> None:
    print(f'Analyzing video: {task.id}, {task.url}')
    tmpDir = f'uploads/{task.id}'

    task.status = 'downloading'
    task.progress = 0.0
    path = download_video(task.url, task.id, task)
    task.url_trimmed = '/' + path.replace('\\\\', '/').replace('\\', '/')

    task.status = 'extracting'
    task.progress = 0.0
    images = extract_frames(path, 20, tmpDir, task)

    task.status = 'analyzing'
    task.progress = 0.0
    task.results = classify_video(images, task)
    task.progress = 1.0
    task.status = 'completed'
    print(f'Analyzed video: {task.id}, {task.url}')
    return


video_tasks = {}
video_tasks_queue = []


@api_view(['POST'])
def analyze_video(request: HttpRequest) -> Response:
    task = VideoTask()
    task.id = uuid.uuid4().__str__()
    task.url = request.data['url']
    task.status = 'queued'
    task.results = []
    task.progress = 0.0

    if request.data['async'] == True:
        with video_tasks_lock:
            video_tasks_queue.append(task)
            video_tasks[task.id] = task
    else:
        with video_tasks_lock:
            video_tasks[task.id] = task
        video_analyzer(task)

    return Response(task.__dict__, status.HTTP_200_OK)


@api_view(['POST'])
def analyze_image(request: HttpRequest) -> Response:
    img = request.FILES["image"]
    fs = FileSystemStorage('uploads')
    fileName = uuid.uuid4().__str__()
    fileName += pathlib.Path(img.name).suffix
    file = fs.save(fileName, img)
    data = classify_image(f'uploads/{fileName}')
    fs.delete(fileName)
    return Response(data, status.HTTP_200_OK)


def video_task_processor():
    while True:
        try:
            with video_tasks_lock:
                task = video_tasks_queue.pop(0) if len(
                    video_tasks_queue) > 0 else None

            if task is not None:
                video_analyzer(task)
        except Exception as e:
            print("Error executing video task: " + e)

        time.sleep(1)


threading.Thread(target=video_task_processor).start()


@api_view(['GET'])
def video_result(request: HttpRequest) -> Response:
    id = request.GET['id']
    with video_tasks_lock:
        if id not in video_tasks:
            return Response({'error': 'Task not found'}, status.HTTP_404_NOT_FOUND)
        return Response(video_tasks[id].__dict__, status.HTTP_200_OK)
