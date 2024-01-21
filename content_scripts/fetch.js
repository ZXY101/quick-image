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
document.getElementById('fuck').innerHTML = 'sdjkfuklosdifklsd';

fetchResource('https://www.bing.com/images/search?q=食べ物').then((thing) => {
  thing.text().then((what) => {
    const parser = new DOMParser();
    const html = parser.parseFromString(what, 'text/html');

    console.log(html.getElementsByTagName('img'));
  });
});
