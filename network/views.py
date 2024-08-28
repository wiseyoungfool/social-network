import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render, get_object_or_404
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator

from .models import User, Post, Comment, Following


def index(request):
    return render(request, "network/index.html")


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")

def profile(request, username):
    this_user = get_object_or_404(User, username=username)
    followers = Following.objects.filter(following=this_user).count()
    following = Following.objects.filter(follower=this_user).count()
    is_following = Following.objects.filter(follower=request.user, following = this_user).exists()
    posts = Post.objects.filter(author=this_user).order_by("-timestamp").all()
    return render(request, "network/profile.html", {
        "user": this_user,
        "followers": followers,
        "following": following,
        "posts": posts,
        "current_user": request.user,
        "is_following": is_following
    })

def following(request):
    return render(request, "network/index.html", {
        "following": True
    })

def view_post(request, username, post_id):
    return render(request, "network/post.html")


#API Routes
@csrf_exempt
@login_required
def post(request):
    # Error Checking
    if request.content_type != "application/json":
        return JsonResponse({"error": "Content-Type must be application/json"}, status=400)
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    #Create Post
    data = json.loads(request.body)
    content = data.get("content", "")
    author = request.user

    new_post = Post(content=content, author=author)
    new_post.save()

    return JsonResponse({"message": "New post was uploaded successfully."}, status=201)

@csrf_exempt
@login_required
def reply(request):
    # Error Checking
    if request.content_type != "application/json":
        return JsonResponse({"error": "Content-Type must be application/json"}, status=400)
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    #Create Post
    data = json.loads(request.body)
    content = data.get("content", "")
    author = request.user
    post_id = data.get("post_id", "")

    post = Post.objects.get(id=post_id)
    new_comment = Comment(content=content, author=author, post=post)
    new_comment.save()

    return JsonResponse({"message": "New post was uploaded successfully."}, status=201)

@csrf_exempt
@login_required
def edit_post(request, post_id):
    if request.method == 'PUT':
        post = get_object_or_404(Post, id=post_id)
        if post.author != request.user:
            return JsonResponse({'error': 'You cannot edit this post.'}, status=403)

        data = json.loads(request.body)
        post.content = data['content']
        post.save()
        return JsonResponse({'success': True})
    return JsonResponse({'error': 'Invalid request method.'}, status=400)

def get_post(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    return JsonResponse({
        'post': post.serialize(current_user=request.user),
        'current_user': request.user.username,
    }, safe=False)

@csrf_exempt
@login_required
def like_post(request, post_id):
    if request.method == 'POST':
        post = get_object_or_404(Post, id=post_id)
        user = request.user

        if user in post.likes.all():
            post.likes.remove(user)
            liked = False
        else:
            post.likes.add(user)
            liked = True

        return JsonResponse({'likes': post.likes.count(), 'liked': liked})
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
@login_required
def like_comment(request, comment_id):
    if request.method == 'POST':
        comment = get_object_or_404(Comment, id=comment_id)
        user = request.user

        if user in comment.likes.all():
            comment.likes.remove(user)
            liked = False
        else:
            comment.likes.add(user)
            liked = True

        return JsonResponse({'likes': comment.likes.count(), 'liked': liked})
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=400)

def get_feed(request, feed):
    if feed=='all':
        posts = Post.objects.all()
    elif feed=='following':
        following = Following.objects.filter(follower=request.user).values_list('following', flat=True)
        posts = Post.objects.filter(author__in=following)
    else:
        this_user = get_object_or_404(User, username=feed)
        posts = Post.objects.filter(author=this_user).order_by("-timestamp").all()

    posts = posts.order_by("-timestamp").all()
    paginator = Paginator(posts, 10)  # Show 10 posts per page

    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return JsonResponse({
        'posts': [post.serialize(current_user=request.user) for post in page_obj],
        'current_user': request.user.username,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
        'page_number': page_obj.number,
        'num_pages': paginator.num_pages
    }, safe=False)

def get_comments(request, post_id):
    comments = Comment.objects.filter(post=post_id)
    comments = comments.order_by("timestamp").all()
    paginator = Paginator(comments, 10)  # Show 10 posts per page

    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return JsonResponse({
        'comments': [comment.serialize(current_user=request.user) for comment in page_obj],
        'current_user': request.user.username,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
        'page_number': page_obj.number,
        'num_pages': paginator.num_pages
    }, safe=False)

@csrf_exempt
@login_required
def follow_user(request, username):
    user_to_follow = get_object_or_404(User, username=username)
    if request.method == 'POST':
        if not Following.objects.filter(follower=request.user, following=user_to_follow).exists():
            new_following = Following(follower=request.user, following=user_to_follow)
            new_following.save()
            return JsonResponse({"message": "Followed successfully"})
        else:
            return JsonResponse({"message": "Already following"}, status=400)
    elif request.method == 'DELETE':
        following_entry = get_object_or_404(Following, follower=request.user, following=user_to_follow)
        following_entry.delete()
        return JsonResponse({"message": "Unfollowed successfully"})
    return JsonResponse({"error": "Invalid request method"}, status=400)

@login_required
def delete_post(request, post_id):
    if request.method == 'DELETE':
        post = get_object_or_404(Post, id=post_id)
        if post.author == request.user:
            post.delete()
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=400)
