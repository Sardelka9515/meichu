from transformers import pipeline, Pipeline
import yt_dlp
import cv2
import pathlib
from typing import List
from .models import *

video_detect = pipeline("image-classification", "umm-maybe/AI-image-detector")
sdxl_detect = pipeline("image-classification", "Organika/sdxl-detector")


def classify_image(image: str, model: Pipeline) -> dict:
    outputs = model(image)
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
        result = classify_image(imgPath, video_detect)
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
        'format': 'bv*[vcodec^=avc][height<=1080]+ba[ext=m4a]/b[ext=mp4][height<=1080]/b',
        'force_keyframes_at_cuts': True
    }

    if task.download_start != None and task.download_end != None and task.download_start < task.download_end:
        ydl_opts["download_ranges"] = lambda info_dict, ydl: [
            {'start_time': task.download_start, 'end_time': task.download_end}]

    # Use yt-dlp to download video to uploads directory and get info
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info_dict = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info_dict)
        return filename


def video_analyzer(task: VideoTask) -> None:
    print(f'Analyzing video: {task.id}, {task.url}')
    tmpDir = f'uploads/{task.id}'
    try:
        task.status = 'downloading'
        task.progress = 0.0
        path = download_video(task.url, task.id, task)
        task.url_trimmed = '/' + path.replace('\\\\', '/').replace('\\', '/')

        task.status = 'extracting'
        task.progress = 0.0
        images = extract_frames(path, task.sample_count, tmpDir, task)

        task.status = 'analyzing'
        task.progress = 0.0
        task.results = classify_video(images, task)
        task.progress = 1.0
        task.status = 'completed'
        print(f'Analyzed video: {task.id}, {task.url}')
    except Exception as e:
        task.status = 'error'
        task.error = str(e)
        print(f'Error analyzing video: {task.id}, {task.url}, {e}')
    return
