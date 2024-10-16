from django.db import models
import threading

# Create your models here.


class ImageTask():
    image = "invalid"
    human = 0.0
    artificial = 0.0


class VideoTask():
    id = "invalid"
    status = "invalid"
    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    results = []
    progress = 0.0
    url_trimmed = "invalid"
