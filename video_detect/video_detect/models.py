from django.db import models
import threading

# Create your models here.


class ImageTask():
    image = "invalid"
    human = 0.0
    artificial = 0.0


class VideoTask():
    id: str = None
    status: str = None
    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    download_start: float = None
    download_end: float = None
    sample_count: int = 20
    results = []
    progress = 0.0
    url_trimmed: str = None
