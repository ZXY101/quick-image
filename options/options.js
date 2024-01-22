function saveOptions(e) {
  e.preventDefault();
  chrome.storage.sync.set({
    pictureField: document.querySelector('#picture-field').value,
    wordField: document.querySelector('#word-field').value,
  });
}

function restoreOptions() {
  chrome.storage.sync
    .get('pictureField')
    .then((result) => {
      document.querySelector('#picture-field').value =
        result.pictureField || 'Picture';
    })
    .catch((error) => {
      console.log(`Error: ${error}`);
    });

  chrome.storage.sync
    .get('wordField')
    .then((result) => {
      document.querySelector('#word-field').value = result.wordField || 'Word';
    })
    .catch((error) => {
      console.log(`Error: ${error}`);
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);

document.getElementById('perms').addEventListener('click', () => {
  chrome.permissions.request({
    origins: ['*://*.bing.com/'],
  });
});
