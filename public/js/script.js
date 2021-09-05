const allPopovers = document.querySelectorAll('[data-bs-toggle="popover"]');
const popoverTriggerList = [].slice.call(allPopovers);
const popoverList = popoverTriggerList.map(
  (popoverTriggerEl) => {
    const createdUserId = popoverTriggerEl.getAttribute('data-createdUserId');
    const currentUserId = popoverTriggerEl.getAttribute('data-currentUserId');
    const storyId = popoverTriggerEl.getAttribute('data-storyId');
    const paragraphId = popoverTriggerEl.getAttribute('data-paragraphId');
    let createdUserName = '';
    let buttonString = '';
    if (createdUserId === currentUserId) {
      createdUserName = 'You!';
      buttonString = `<hr /><a class="btn btn-primary w-100" href="/story/${storyId}/paragraph/${paragraphId}" role="button">Edit</a>`;
    } else {
      createdUserName = popoverTriggerEl.getAttribute('data-createdUserName');
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
