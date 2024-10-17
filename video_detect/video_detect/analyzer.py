
from transformers import pipeline
import yt_dlp
import cv2
import pathlib
from typing import List
from .models import *

pipe = pipeline("image-classification", "umm-maybe/AI-image-detector")


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
