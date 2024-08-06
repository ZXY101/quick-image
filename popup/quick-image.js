async function fetchResource(input, init) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ input, init }, (messageResponse) => {
      const [response, error] = messageResponse;
      if (response === null) {
        reject(error);
      } else {
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

function updateImages() {
  const count = document.getElementById('count');
  count.textContent = `${index + 1}-${index + 6}/${links.length}`;

  for (let i = 0; i < 6; i++) {
    const imgElement = document.getElementById(`img-${i + 1}`);
    const imgIndex = index + i;

    if (imgIndex < links.length) {
      imgElement.src = links[imgIndex];
      imgElement.style.display = 'block';
    } else {
      imgElement.style.display = 'none';
    }
  }
}

getLastCardInfo()
  .then(async (lastCard) => {
    const get = await chrome.storage.sync.get('wordField');
    const wordField = get.wordField || 'Word';
    const phrase = lastCard.fields[`${wordField}`].value;

    document.getElementById('left').addEventListener('click', () => {
      if (links.length === 0) return;

      if (index > 0) {
        index -= 6;
        updateImages();
      } else {
        index = Math.max(0, links.length - 6);
        updateImages();
      }
    });

    document.getElementById('right').addEventListener('click', () => {
      if (links.length === 0) return;

      if (index < links.length - 6) {
        index += 6;
        updateImages();
      } else {
        index = 0;
        updateImages();
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

        links = [...images]
            .map((img) => {
                return JSON.parse(img.attributes["m"].value).turl;
            })
            .filter((link) => link);

    updateImages();

    for (let i = 0; i < 6; i++) {
      document.getElementById(`img-${i + 1}`).addEventListener('click', async () => {
        const imgIndex = index + i;
        if (imgIndex < links.length) {
          const res = await fetch(links[imgIndex]);
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
                const message = document.createElement('div');
		message.textContent = 'Image added to card';
		message.style.position = 'fixed';
		message.style.bottom = '20px';
		message.style.left = '50%';
		message.style.transform = 'translateX(-50%)';
		message.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
		message.style.color = 'white';
		message.style.padding = '10px 20px';
		message.style.borderRadius = '5px';
		message.style.zIndex = '1000';
		document.body.appendChild(message);

		setTimeout(() => {
		    message.remove();
		    window.close();
  }, 2000);
            });
          }
        }
      });
    }
  })
  .catch((err) => {
    console.log('Something went wrong: ', err);
    document.getElementById('error').textContent = `Error: ${err}`;
    chrome.runtime.openOptionsPage();
  });
