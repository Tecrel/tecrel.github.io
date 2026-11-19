const tools = document.querySelector('.archive-tools');
const buttons = [...tools.querySelectorAll('button')];
const input = tools.querySelector('input');
const posts = [...document.querySelectorAll('.post')];
const empty = document.querySelector('#empty');
const status = document.querySelector('#count');
let category;

function filter() {
  const query = input.value.trim().toLocaleLowerCase();
  let count = 0;
  for (const post of posts) {
    const inCategory = !category || post.dataset.category === category;
    post.hidden = !(inCategory && post.dataset.search.toLocaleLowerCase().includes(query));
    if (!post.hidden) count++;
  }
  empty.hidden = count > 0;
  status.textContent = `显示 ${count} 篇文章`;
}

for (const button of buttons) {
  button.addEventListener('click', () => {
    category = button.dataset.filter;
    for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
    filter();
  });
}
input.addEventListener('input', filter);
tools.hidden = false;
