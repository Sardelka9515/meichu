import time
from django.http.request import HttpRequest
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import *
import pathlib
import shutil
import uuid
from django.core.files.storage import FileSystemStorage
from .models import *
import threading
from typing import List
from .analyzer import *
from video_detect import settings
video_tasks_lock = threading.Lock()
# Clear all files in upload directory
shutil.rmtree('uploads', ignore_errors=True)
video_tasks = {}
video_tasks_queue = []


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


def authenticate(request: HttpRequest) -> bool:
    # Check if the API key is in the header
    if 'X-API-KEY' not in request.headers:
        return False
    return request.headers['X-API-KEY'] in settings.API_KEYS


@api_view(['POST'])
def analyze_video(request: HttpRequest) -> Response:
    if not authenticate(request):
        return Response({'error': 'Unauthorized'}, status.HTTP_401_UNAUTHORIZED)

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
    if not authenticate(request):
        return Response({'error': 'Unauthorized'}, status.HTTP_401_UNAUTHORIZED)

    img = request.FILES["image"]
    fs = FileSystemStorage('uploads')
    fileName = uuid.uuid4().__str__()
    fileName += pathlib.Path(img.name).suffix
    file = fs.save(fileName, img)
    data = classify_image(f'uploads/{fileName}')
    fs.delete(fileName)
    return Response(data, status.HTTP_200_OK)


@api_view(['GET'])
def video_result(request: HttpRequest) -> Response:
    if not authenticate(request):
        return Response({'error': 'Unauthorized'}, status.HTTP_401_UNAUTHORIZED)

    id = request.GET['id']
    with video_tasks_lock:
        if id not in video_tasks:
            return Response({'error': 'Task not found'}, status.HTTP_404_NOT_FOUND)
        return Response(video_tasks[id].__dict__, status.HTTP_200_OK)
