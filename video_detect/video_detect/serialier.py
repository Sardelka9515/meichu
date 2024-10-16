from rest_framework import serializers
from .models import VideoAnalysis,ImageAnalysis

class VideoAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoAnalysis
        fields = '__all__'

        
class ImageAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImageAnalysis
        fields = '__all__'