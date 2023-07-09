import onChange from 'on-change';
import axios from 'axios';
import * as yup from 'yup';
import { string } from 'yup';
import _ from 'lodash';
import { render, handleProcessState } from './view';
import parser from './parser';

yup.setLocale({
  string: {
    url: () => 'validate.errors.invalidUrl',
  },
});

const urlSchema = (string().url().nullable());

const state = {
  urls: [],
  isValid: '',
  error: '',
  content: [],
  uiState: {
    watchedPosts: [],
  },
  modalPost: '',
};

const watchedState = onChange(state, (path) => {
  switch (path) {
    case 'isValid':
      handleProcessState(state);
      break;
    case 'content':
      render(state, 'content');
      break;
    case 'uiState.watchedPosts':
      render(state, 'content');
      break;
    case 'modalPost':
      render(state, 'modalPost');
      break;
    default:
      break;
  }
});

const responseDocument = (url, doc, initialState) => {
  const feedTitle = doc.body.querySelector('title').textContent;
  const feedDescription = doc.body.querySelector('description').textContent;
  const posts = doc.querySelectorAll('item');
  const feedUrl = url;

  // первое добавление фида в стейт
  if (!initialState.urls.includes(url)) {
    const feedsCount = initialState.content.length;
    const postsArea = feedsCount * 100;
    const feedId = postsArea;

    const feedPosts = [];
    posts.forEach((post) => {
      const postId = feedPosts.length;
      const postTitle = post.querySelector('title').textContent;
      const postDescription = post.querySelector('description').textContent;
      const linkElement = post.querySelector('link');
      const postLink = linkElement.nextSibling.textContent.trim();
      feedPosts.unshift({
        postTitle, postDescription, postLink, postId,
      });
    });

    initialState.urls.push(url);
    watchedState.isValid = 'done';
    watchedState.content.push({
      feedTitle, feedDescription, feedId, feedUrl, feedPosts,
    });
  } else {
  // проверка на новые посты
    const findFeed = (obj) => (_.get(obj, 'feedUrl') === url);
    const currentFeed = initialState.content.find(findFeed);

    const feedPosts = [];
    posts.forEach((post) => {
      const postId = feedPosts.length;
      const postTitle = post.querySelector('title').textContent;
      const postDescription = post.querySelector('description').textContent;
      const linkElement = post.querySelector('link');
      const postLink = linkElement.nextSibling.textContent.trim();
      feedPosts.unshift({
        postTitle, postDescription, postLink, postId,
      });
    });
    currentFeed.feedPosts = feedPosts;
    render(state, 'content');
  }
};
// console.log(postsCount, currentFeed.postsCount);
// if (postsCount > currentFeed.postsCount) {
//   // проверка на новые посты

//   // posts.forEach((post) => {
//   //   const postTitle = post.querySelector('title').textContent;
//   //   const postDescription = post.querySelector('description').textContent;
//   //   const linkElement = post.querySelector('link');
//   //   const postLink = linkElement.nextSibling.textContent.trim();
//   //   watchedState.posts.unshift({
//   //     postTitle, postDescription, postLink,
//   //   });
//   //   // postId += 1;
//   // });
// }

// const buttons = document.querySelectorAll('.btn-sm');
// buttons.forEach((button) => {
//   button.addEventListener('click', () => {
//     console.log(button);
//     const link = button.previousSibling;
//     const watchedPostLink = link.getAttribute('href');
//     const watchedPostId = button.getAttribute('data-id');
//     const findPost = (obj) => (_.get(obj, 'postId') === Number(watchedPostId));
//     watchedState.modalPost = state.posts.find(findPost);
//     watchedState.uiState.watchedPosts.push(watchedPostLink);
//   });

const postsSelection = (url) => {
  axios({
    method: 'get',
    url: `https://allorigins.hexlet.app/get?disableCache=true&url=${url}`,
    timeout: 10000,
  })
    .then((response) => response.data)
    .then((data) => data.contents)
    .then((text) => parser(text))
    .then((doc) => {
      responseDocument(url, doc, state);
    })
    .catch((error) => {
      switch (error.name) {
        case 'TypeError':
          state.error = 'validate.errors.invalidRss';
          watchedState.isValid = 'error';
          break;
        case 'AxiosError':
          state.error = 'validate.errors.networkError';
          watchedState.isValid = 'error';
          break;
        default:
          break;
      }
      console.log(error.message);
    });
};

// const checkFeed = (url) => {
//   fetch(`https://allorigins.hexlet.app/get?disableCache=true&url=${url}`)
//     .then((response) => response.json())
//     .then((data) => data.contents)
//     .then((text) => parser(text))
//     .then((doc) => {
//       const posts = doc.querySelectorAll('item');
//       const postsCount = posts.length;
//       const findElement = (obj) => (_.get(obj, 'feedUrl') === url);

//       const currentFeed = state.content.find(findElement);
//       // if (postsCount > currentFeed.feedPosts.length) {
//       // делаем отрисовку заново
//       currentFeed.feedPosts = [];
//       console.log('Возможная отрисовка');
//       posts.forEach((post) => {
//         const postTitle = post.querySelector('title').textContent;
//         const postDescription = post.querySelector('description').textContent;
//         const linkElement = post.querySelector('link');
//         const postLink = linkElement.nextSibling.textContent.trim();
//         currentFeed.feedPosts.push({
//           postTitle, postDescription, postLink,
//         });
//         render(state);
//       });
//       // }
//     })
//     .catch((error) => console.log(error));
// };
let timerId = '';
const checkFeed = () => {
  clearTimeout(timerId);
  timerId = setTimeout(function innerFunc() {
    state.content.forEach(({ feedUrl }) => {
      postsSelection(feedUrl);
    });
    timerId = setTimeout(innerFunc, 5000);
  }, 5000);
};

const app = () => {
  const form = document.querySelector('form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const urlName = formData.get('url');
    if (!urlName) {
      state.error = 'validate.errors.emptyUrl';
      watchedState.isValid = 'error';
    } else {
      urlSchema.validate(urlName).then((response) => {
        if (state.urls.includes(response)) {
          state.error = 'validate.errors.urlRepeatable';
          watchedState.isValid = 'error';
        } else {
          state.error = '';
          watchedState.isValid = 'sending';
          postsSelection(urlName);
          checkFeed();
          // clearTimeout(timerId);
          // timerId = setTimeout(function innerFunc() {
          //   state.feeds.forEach(({ feedUrl }) => {
          //     postsSelection(feedUrl);
          //   });
          //   timerId = setTimeout(innerFunc, 5000);
          // }, 5000);
        }
      })
        .catch((error) => {
          state.error = error.message;
          watchedState.isValid = 'error';
        });
    }
  });
  const postsList = document.querySelector('.list-group');
  postsList.addEventListener('click', (e) => {
    const post = e.target.closest('.list-group-item');
    const button = post.querySelector('button');
    const link = button.previousSibling;
    if (e.target === button || e.target === link) {
      const watchedPostLink = link.getAttribute('href');
      const currentFeed = link.getAttribute('data-feedUrl');
      const watchedPostId = button.getAttribute('data-id');
      const findFeed = (obj) => (_.get(obj, 'feedUrl') === currentFeed);
      const postFeed = state.content.find(findFeed);
      const { feedPosts } = postFeed;
      const findPost = (obj) => (_.get(obj, 'postId') === Number(watchedPostId));
      watchedState.modalPost = feedPosts.find(findPost);
      watchedState.uiState.watchedPosts.push(watchedPostLink);
    }
  });
};

export default app;
