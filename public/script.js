const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

let conversation = [];

/* AUTO RESIZE TEXTAREA */

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = input.scrollHeight + 'px';
});

/* SUBMIT */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userMessage = input.value.trim();
  if (!userMessage) return;
  removeWelcome();
  appendMessage('user', userMessage);
  conversation.push({
    role: 'user',
    text: userMessage
  });

  input.value = '';
  input.style.height = 'auto';
  input.disabled = true;
  const thinking = appendMessage(
    'model',
    '⏳ Sedang berpikir...'
  );

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        conversation
      })
    });

    const data = await response.json();
    if (response.ok && data.result) {
      const html = DOMPurify.sanitize(
        marked.parse(data.result)
      );

      thinking.innerHTML = html;

      /* Highlight code */
      thinking.querySelectorAll('pre code')
        .forEach((block) => {
          hljs.highlightElement(block);
        });

      conversation.push({
        role: 'model',
        text: data.result
      });
      conversation = conversation.slice(-10);
    } else {

      thinking.innerHTML =
        '❌ Gagal mengambil response';
    }

  } catch (error) {
    console.error(error);
    thinking.innerHTML =
      '❌ Server error';

  } finally {
    input.disabled = false;
    input.focus();
  }
});

/* APPEND MESSAGE */
function appendMessage(role, text) {
  const row = document.createElement('div');
  row.classList.add('message-row', role);
  const message = document.createElement('div');
  message.classList.add('message', role);
  message.innerHTML = DOMPurify.sanitize(
    marked.parse(text)
  );

  row.appendChild(message);
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
  return message;
}

/* REMOVE WELCOME */

function removeWelcome() {
  const welcome = document.querySelector('.welcome');
  if (welcome) {
    welcome.remove();
  }
}

const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggle-sidebar');
if (toggleSidebar) {
  toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('closed');
  });
}