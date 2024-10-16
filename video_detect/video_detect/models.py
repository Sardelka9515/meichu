from django.db import models

# Create your models here.

class ImageAnalysis(models.Model):
    image = models.TextField(primary_key = True)
    human = models.FloatField()
    artificial = models.FloatField()
    def __str__(self) -> str:
        return self.image +'\n' + self.human +'\n' + self.artificial
    
class VideoAnalysis(models.Model):
    id = models.TextField(primary_key = True)
    status = models.TextField()
    url = models.URLField()
    results = models.ManyToManyField(ImageAnalysis, blank=True)
    progress = models.FloatField()
    def __str__(self) -> str:
        return self.id +'\n' + self.status +'\n' + self.url +'\n' + self.progress +'\n' + self.result
    
