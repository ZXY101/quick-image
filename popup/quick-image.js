function fetchResource(input, init) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ input, init }, (messageResponse) => {
      const [response, error] = messageResponse;
      if (response === null) {
        reject(error);
      } else {
        // Use undefined on a 204 - No Content
        const body = response.body ? new Blob([response.body]) : undefined;
        resolve(
          new Response(body, {
            status: response.status,
            statusText: response.statusText,
          })
        );
      }
    });
  });
}

async function ankiConnect(action, params) {
  try {
    const res = await fetch('http://127.0.0.1:8765', {
      method: 'POST',
      body: JSON.stringify({ action, params, version: 6 }),
    });
    const json = await res.json();

    if (json.error) {
      throw new Error(json.error);
    }

    return json.result;
  } catch (e) {
    showSnackbar(`Error: ${e?.message ?? e}`);
  }
}

async function getCardInfo(id) {
  const [noteInfo] = await ankiConnect('notesInfo', { notes: [id] });
  return noteInfo;
}

async function getLastCardId() {
  const notesToday = await ankiConnect('findNotes', { query: 'added:1' });
  const id = notesToday.sort().at(-1);
  return id;
}

async function getLastCardInfo() {
  const id = await getLastCardId();
  return await getCardInfo(id);
}

function getCardAgeInMin(id) {
  return Math.floor((Date.now() - id) / 60000);
}

async function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function imageToWebp(source) {
  const image = await createImageBitmap(source);

  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d');

  if (context) {
    context.drawImage(image, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/webp' });
    image.close();

    return await blobToBase64(blob);
  }
}

let index = 0;
let links = [];

function updateImage() {
  const image = document.getElementById('image');
  const count = document.getElementById('count');

  image.src = links[index];
  count.textContent = `${index + 1}/${links.length}`;
}

getLastCardInfo()
  .then(async (lastCard) => {
    const phrase = lastCard.fields.Word.value;

    document.getElementById('left').addEventListener('click', () => {
      if (images.length === 0) return;

      if (index > 0) {
        index--;
        updateImage();
      } else {
        index = images.length - 1;
        updateImage();
      }
    });

    document.getElementById('right').addEventListener('click', () => {
      if (images.length === 0) return;

      if (index < links.length - 1) {
        index++;
        updateImage();
      } else {
        index = 0;
        updateImage();
      }
    });

    document.getElementById('add').addEventListener('click', async () => {
      if (images.length === 0) return;

      const res = await fetch(links[index]);
      const blob = await res.blob();

      const imageData = await imageToWebp(blob);
      const id = await getLastCardId();

      const get = await chrome.storage.sync.get('pictureField');
      const pictureField = get.pictureField ?? 'Picture';

      if (imageData) {
        ankiConnect('updateNoteFields', {
          note: {
            id,
            fields: {
              [pictureField]: '',
            },
            picture: {
              filename: `_${id}.webp`,
              data: imageData.split(';base64,')[1],
              fields: [pictureField],
            },
          },
        }).then(() => {
          alert('Image added to card');
          window.close();
        });
      }
    });

    document.getElementById('phrase').textContent = phrase;

    const res = await fetchResource(
      `https://www.bing.com/images/search?q=${phrase}`
    );

    const text = await res.text();
    const parser = new DOMParser();
    const html = parser.parseFromString(text, 'text/html');

    const images = html.getElementsByClassName('iusc');

    links = [...images].map((img) => {
      return JSON.parse(img.attributes['m'].value).turl;
    });

    updateImage();
  })
  .catch(() => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
