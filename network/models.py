from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    pass

class Post(models.Model):
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    likes = models.ManyToManyField(User, related_name='liked_posts')
    timestamp = models.DateTimeField(default=timezone.now)

    def serialize(self, current_user=None):
        return {
            "id": self.id,
            "content": self.content,
            "author": self.author.username,
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            'likes': self.likes.count(),
            'is_liked': current_user in self.likes.all() if current_user else False,
        }

    def __str__(self):
        return f"{self.author} at {self.timestamp.strftime("%Y-%m-%d %H:%M:%S")}: {self.content}"

class Comment(models.Model):
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    likes = models.ManyToManyField(User, related_name='liked_comments')
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(default=timezone.now)

    def serialize(self, current_user=None):
        return {
            "id": self.id,
            "content": self.content,
            "author": self.author.username,
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            'likes': self.likes.count(),
            'is_liked': current_user in self.likes.all() if current_user else False,
        }

    def __str__(self):
        return f"{self.author} at {self.timestamp.strftime("%Y-%m-%d %H:%M:%S")}: {self.content}"

class Following(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='follower_set')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following_set')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def clean(self):
        if self.follower == self.following:
            raise ValidationError("User cannot follow themselves.")

    def __str__(self):
        return f"{self.follower} is following {self.following}"

    def serialize(self):
        return {
            "follower": self.follower.username,
            "following": self.following.username
        }
