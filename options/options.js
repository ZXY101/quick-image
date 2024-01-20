function saveOptions(e) {
  e.preventDefault();
  browser.storage.sync.set({
    pictureField: document.querySelector('#picture-field').value,
  });
}

function restoreOptions() {
  function setCurrentChoice(result) {
    document.querySelector('#picture-field').value =
      result.pictureField || 'Picture';
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  let getting = browser.storage.sync.get('pictureField');
  getting.then(setCurrentChoice, onError);
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);

document.getElementById('perms').addEventListener('click', () => {
  browser.permissions.request({
    origins: ['*://*.bing.com/'],
  });
});
