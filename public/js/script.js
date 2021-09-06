const allPopovers = document.querySelectorAll('[data-bs-toggle="popover"]');
const popoverTriggerList = [].slice.call(allPopovers);
const allAnchorNames = document.querySelectorAll('.anchor-name');
const popoverList = popoverTriggerList.map(
  (popoverTriggerEl) => {
    const createdUserId = popoverTriggerEl.getAttribute('data-createdUserId');
    const currentUserId = popoverTriggerEl.getAttribute('data-currentUserId');
    const storyUserId = popoverTriggerEl.getAttribute('data-storyUserId');
    const storyId = popoverTriggerEl.getAttribute('data-storyId');
    const paragraphId = popoverTriggerEl.getAttribute('data-paragraphId');
    let createdUserName = '';
    let buttonString = '';
    if (createdUserId === currentUserId) {
      createdUserName = 'You!';
    } else {
      createdUserName = popoverTriggerEl.getAttribute('data-createdUserName');
    }

    if (createdUserId === currentUserId || storyUserId === currentUserId) {
      buttonString = `<hr /><a class="btn btn-primary w-100" href="/story/${storyId}/paragraph/${paragraphId}" role="button">Edit</a>`;
    }

    return new bootstrap.Popover(
      popoverTriggerEl, {
        html: true,
        content: `
          <p class='mb-0'>
            <i>Authored by: ${createdUserName}</i>
          </p>${buttonString}
        `,
      },
    );
  },
);

if (allAnchorNames.length > 0) {
  document.querySelector('.anchor-name').scrollIntoView({ behavior: 'smooth' });
}
