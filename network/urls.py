
from django.urls import path

from . import views

urlpatterns = [
    # View Routes
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("profile/<str:username>", views.profile, name="profile"),
    path("profile/<str:username>/<int:post_id>", views.view_post, name="view_post"),
    path("following", views.following, name="following"),

    # API Routes
    path("post", views.post, name="post"),
    path("reply", views.reply, name="reply"),
    path("post/<int:post_id>", views.get_post, name="get_post"),
    path("post/<str:feed>", views.get_feed, name="get_feed"),
    path("comments/<int:post_id>", views.get_comments, name="get_comments"),
    path('follow/<str:username>/', views.follow_user, name='follow_user'),
    path('post/<int:post_id>/like', views.like_post, name='like_post'),
    path('comments/<int:comment_id>/like', views.like_comment, name='like_comment'),
    path('post/<int:post_id>/edit', views.edit_post, name='edit_post'),
    path('post/<int:post_id>/delete', views.delete_post, name='delete_post'),
]
