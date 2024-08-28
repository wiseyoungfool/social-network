document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Content Loaded");
    const followBtn = document.querySelector('#follow-btn');
    const postBtn = document.querySelector('#submit-post');
    const replyBtn = document.querySelector('#submit-reply');

    if (postBtn) {
      postBtn.addEventListener('click', () => submit_new_post(event));
    }

    if (followBtn) {
        followBtn.addEventListener('click', () => toggleFollow(followBtn));
    }

    const path = window.location.pathname;
    if (path==="/") {
      load_posts("all");
    }
    else if (path==="/following") {
      load_posts("following");
    } else if (path.startsWith("/profile/")) {
      const parts = path.split('/');
      const author = parts[2];
      const post_id = parts[3];
      if (post_id != null) {
        load_post(author, post_id);
        load_comments(post_id);
        if (replyBtn) {
          replyBtn.addEventListener('click', () => submit_new_reply(event, post_id));
        }
      } else if (author != null) {
        load_posts(author);
      }
    }
});

function load_post(author, post_id) {
  console.log("Loading post...");
  const postDiv = document.querySelector('#main-post');

  fetch(`/post/${post_id}`)
  .then(response => response.json())
  .then(data => {
    const post = data.post;
    const currentUser = data.current_user;
    console.log(post);
    renderPost(postDiv, post, currentUser);
    console.log("Post load successfull.");
  });
}

function load_comments(post_id, page=1) {
  console.log("Loading Comments...");

  const commentsView = document.querySelector('#comments-view');

  fetch(`/comments/${post_id}?page=${page}`)
  .then(response => response.json())
  .then(data => {
    // Print posts
    console.log(data);
    const comments = data.comments;
    const currentUser = data.current_user;

    comments.forEach(comment => {
      renderPost(commentsView, comment, currentUser, true);
    });
  });
}

function load_posts(type="all", page=1) {
    console.log("Refreshing Posts...");

    const postFeed = document.querySelector('#posts-view')
    if (type==="all") {postFeed.innerHTML="<h1 style='text-align: center'>All Posts</h1>"}
    else if (type==="following") {postFeed.innerHTML="<h1 style='text-align: center'>Following</h1>"}
    else {postFeed.innerHTML="<h1 style='text-align: center'>Posts</h1>"}

    fetch(`/post/${type}?page=${page}`)
    .then(response => response.json())
    .then(data => {
      // Print posts
      console.log(data);
      const posts = data.posts;
      const currentUser = data.current_user;

      posts.forEach(post => {
        renderPost(postFeed, post, currentUser);
      });

      // Add pagination buttons
      const paginationDiv = document.createElement('nav');
      paginationDiv.setAttribute('aria-label', 'Page navigation');
      const paginationList = document.createElement('ul');
      paginationList.classList.add('pagination', 'justify-content-center');
      paginationDiv.appendChild(paginationList);

      if (data.has_previous) {
          const prevItem = document.createElement('li');
          prevItem.classList.add('page-item');
          const prevLink = document.createElement('a');
          prevLink.classList.add('page-link');
          prevLink.href = '#';
          prevLink.textContent = 'Previous';
          prevLink.addEventListener('click', () => load_posts(type, page - 1));
          prevItem.appendChild(prevLink);
          paginationList.appendChild(prevItem);
      } else {
          const prevItem = document.createElement('li');
          prevItem.classList.add('page-item', 'disabled');
          const prevLink = document.createElement('a');
          prevLink.classList.add('page-link');
          prevLink.href = '#';
          prevLink.textContent = 'Previous';
          prevItem.appendChild(prevLink);
          paginationList.appendChild(prevItem);
      }

      if (data.has_next) {
          const nextItem = document.createElement('li');
          nextItem.classList.add('page-item');
          const nextLink = document.createElement('a');
          nextLink.classList.add('page-link');
          nextLink.href = '#';
          nextLink.textContent = 'Next';
          nextLink.addEventListener('click', () => load_posts(type, page + 1));
          nextItem.appendChild(nextLink);
          paginationList.appendChild(nextItem);
      } else {
          const nextItem = document.createElement('li');
          nextItem.classList.add('page-item', 'disabled');
          const nextLink = document.createElement('a');
          nextLink.classList.add('page-link');
          nextLink.href = '#';
          nextLink.textContent = 'Next';
          nextItem.appendChild(nextLink);
          paginationList.appendChild(nextItem);
      }

      postFeed.appendChild(paginationDiv);
  });
}

function renderPost(parent, post, currentUser, comment=false) {
    // Create a new div for each post
    const postDiv = document.createElement('div');
    postDiv.classList.add("post");

    // Add details to the div
    postDiv.innerHTML = `
      <h4 style='text-align: center'><a href="/profile/${post.author}">${post.author}</a></h4>
      <div style='margin: 20px; padding=20px;' id='post-content'>${post.content}</div>
      <div style='color: grey' id='post-timestamp'>@${post.timestamp}</div>
    `;

    // Create interaction area
    const buttonArea = document.createElement('div');
    buttonArea.classList.add('button-area');

    //Create the like button
    const likeBtn = document.createElement('div');
    likeBtn.style.margin = "10px";
    let likes=post.likes;
    let isLiked = post.is_liked;
    likeBtn.innerHTML = `<button class='btn ${isLiked ? 'btn-danger' : 'btn-primary'}'>${isLiked ? 'Unlike' : 'Like'}</button> Likes: <span id='post-likes'>${likes}</span>`;
    likeBtn.setAttribute('likes', `${likes}`);
    likeBtn.setAttribute('data-post-id', post.id)
    likeBtn.setAttribute('is-liked','false');

    likeBtn.addEventListener('click', function() {
      toggleLike(likeBtn, comment)
    });

    // Create the edit button
    if (post.author === currentUser && comment===false) {  // Ensure this is the current user's post
      const editBtn = document.createElement('button');
      editBtn.style.margin = "10px";
      editBtn.classList.add('btn', 'btn-secondary');
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', function() {
        editPost(post.id, postDiv);
      });
      buttonArea.appendChild(editBtn);
    }

    // Create the comment button
    const commentBtn = document.createElement('div');
    if (comment===false) {
      commentBtn.style.margin = "10px";
      let comments=0; //post.comments;
      commentBtn.innerHTML = `<button class='btn btn-primary'>Reply</button> Comments: <span id='post-likes'>${comments}</span>`;

      commentBtn.addEventListener('click', function() {
        view_post(post.author, post.id)
      });
    }

    // Create the delete button
    if (post.author === currentUser) {  // Ensure this is the current user's post
      const deleteBtn = document.createElement('button');
      deleteBtn.style.margin = "10px";
      deleteBtn.classList.add('btn', 'btn-danger');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', function() {
        deletePost(post.id);
      });
      buttonArea.appendChild(deleteBtn);
    }
    // Append the divs to the post feed
    parent.appendChild(postDiv);
    postDiv.appendChild(buttonArea);
    buttonArea.appendChild(likeBtn);
    buttonArea.appendChild(commentBtn);
}

function deletePost(postID) {
  
}

function editPost(postId, postDiv) {
  const contentDiv = postDiv.querySelector('#post-content');
  const originalContent = contentDiv.innerHTML.split('<br>')[0];
  contentDiv.classList.add('edit-post');
  // Replace content with a textarea
  const textarea = document.createElement('textarea');
  textarea.value = originalContent;
  textarea.rows = 2;
  textarea.cols=60;
  contentDiv.innerHTML = '';
  contentDiv.appendChild(textarea);

  // Create a save button
  const saveBtn = document.createElement('button');
  saveBtn.classList.add('btn', 'btn-primary');
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', function() {
    savePostEdit(postId, textarea.value, contentDiv);
    contentDiv.classList.remove('edit-post');
  });
  contentDiv.appendChild(saveBtn);
}

function savePostEdit(postId, newContent, contentDiv) {
  fetch(`/post/${postId}/edit`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: newContent
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      contentDiv.innerHTML = newContent;
    } else {
      alert('Error saving post');
    }
  });
}


function toggleLike(button, comment=false) {
  const postId = button.getAttribute('data-post-id');
  const isLiked = button.getAttribute('is-liked') === 'true';
  const button_element = button.querySelector('button');
  let route = `/post/${postId}/like`;
  if (comment) {
    route = `/comments/${postId}/like`
  }

  fetch(route, {
    method: 'POST',
  })
  .then(response => response.json())
  .then(data => {
    let likes = data.likes;
    if (data.liked) {
      button_element.classList.remove('btn-primary');
      button_element.classList.add('btn-danger');
      button_element.textContent = 'Unlike';
      button.setAttribute('is-liked', 'true');
      console.log("Liked Post")
    } else {
      button_element.classList.remove('btn-danger');
      button_element.classList.add('btn-primary');
      button_element.textContent = 'Like';
      button.setAttribute('is-liked', 'false');
      console.log("Unliked Post")
    }
    button.querySelector('span').textContent = `${likes}`;
    button.setAttribute('likes', `${likes}`);
  });
}

function view_post(author, post_id) {
    window.location.href = `/profile/${author}/${post_id}`;
    console.log(`View Post: ${post_id}`);
}

function toggleFollow(button) {
  const isFollowing = button.getAttribute('data-following') === 'true';
  const username = button.getAttribute('data-username');

  fetch(`/follow/${username}/`, {
      method: isFollowing ? 'DELETE' : 'POST',
  })
  .then(response => response.json())
  .then(data => {
      console.log(data);
      const followerCountElement = document.getElementById('follower-count');
      let followerCount = parseInt(followerCountElement.textContent);
      if (isFollowing) {
        button.classList.remove('btn-danger');
        button.classList.add('btn-primary');
        button.setAttribute('data-following', 'false');
        button.textContent = 'Follow';
        followerCount -= 1;
      } else {
        button.classList.remove('btn-primary');
        button.classList.add('btn-danger');
        button.setAttribute('data-following', 'true');
        button.textContent = 'Unfollow';
        followerCount += 1;
      }
      followerCountElement.textContent = followerCount;
  });
}


function submit_new_post(event) {
  event.preventDefault();
  console.log("New Post submitted");
  const post_content = document.querySelector("#new-post-content").value;

  fetch('/post', {
      method: 'POST',
      body: JSON.stringify({
          content: post_content,
      }),
      headers: {
          'Content-Type': 'application/json',
      }
  })
  .then(response => response.json())
  .then(response => {
      console.log(response);
      document.querySelector("#new-post-content").value = "";
      load_posts("all");
  });
}


function submit_new_reply(event, postID) {
  event.preventDefault();
  console.log("New Reply submitted");
  const reply_content = document.querySelector("#new-reply-content").value;

  fetch('/reply', {
      method: 'POST',
      body: JSON.stringify({
          content: reply_content,
          post_id: postID,
      }),
      headers: {
          'Content-Type': 'application/json',
      }
  })
  .then(response => response.json())
  .then(response => {
      console.log(response);
      document.querySelector("#new-reply-content").value = "";
      load_comments(postID);
      console.log("Reply submitted successfully.");
  });
}
