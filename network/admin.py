from django.contrib import admin
from .models import User, Post, Comment, Following

# Register your models here.
admin.site.register(User)
admin.site.register(Post)
admin.site.register(Comment)
admin.site.register(Following)
