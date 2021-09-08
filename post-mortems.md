# Technical Review

### What went well? Please share a link to the specific code.

I liked that I was able to use the knowledge I can return another function within a function to refactor my route handlers, despite the fact that most of these handlers require `pool` accepted as a parameter.

For reference, starting from [line 56 in index.js](https://github.com/leechuanxin/made-in-sg/blob/main/index.js#L56), the code is streamlined only to initiate the routes.

The handlers, instead, were initialised in `routes.js`. An example of such a handler is the `handleIndex` function on [line 7](https://github.com/leechuanxin/made-in-sg/blob/main/routes.js#L7).

Initially, the tricky part is consolidating this knowledge together with understanding arrow functions, as well as function callbacks. Using [line 7](https://github.com/leechuanxin/made-in-sg/blob/main/routes.js#L7) again as the example, it helped first knowing that `handleIndex` accepts `pool` as a parameter, then returns an anonymous function that accepts `request` and `response` as parameters.

### What were the biggest challenges you faced? Please share a link to the specific code.

When developing the initial UI for previewing a paragraph's author and including a link to edit a paragraph, I kept falling back to a popover interface, similar to Medium's.

I was reluctant to use a popover, because I initially thought only text content can be inserted into a popover. Upon learning about the `html` [option Bootstrap's popover offers](https://getbootstrap.com/docs/5.1/components/popovers/#options), I was still worried due to the fear of XSS. I did not seek to resolve this in the end, because I thought I was looking too far ahead, and my initial learning goal wasn't to optimise for security in this project.

In my 1-on-1 discussions with my instructor Akira, I realised it is probably not a good practice to use middleware as a convenient way to set global values from entries returned by the `request` or `response` object.

The suggestion is to refactor the conceptually problematic middleware as JavaScript modules. This refactoring was a challenge; it required an understanding that in a Promise chain, the callbacks within each `.then` function should also return Promise-like objects.

For reference, when I first wrote these modules as middleware, I used them [like so](https://github.com/leechuanxin/made-in-sg/blob/409757835d3435d5be018ebba886e110791f3938/index.js#L67). In the middleware module, the [function is written as checkStoryCollab](https://github.com/leechuanxin/made-in-sg/blob/409757835d3435d5be018ebba886e110791f3938/middleware.js#L51), as a convenient way to [retrieve key-values required in the entire story as request.story](https://github.com/leechuanxin/made-in-sg/blob/409757835d3435d5be018ebba886e110791f3938/middleware.js#L134).

The end result of the refactoring is [a module that calls separate smaller modules](https://github.com/leechuanxin/made-in-sg/blob/main/promises.js#L138).

In the end, I was still a little confused about when I should return an entirely new Promise in a callback, and when `Promise.resolve()` will suffice instead. For example, why would I have to [write my sub-modules in such a manner](https://github.com/leechuanxin/made-in-sg/blob/main/promises.js#L138), when [Promise.resolve suffices in another example](https://github.com/leechuanxin/made-in-sg/blob/main/routes.js#L286)?

### What would you do differently next time?

I would definitely revisit Promises again when self-studying, because I do not feel that I have a strong enough grasp of that.

Also, I would probably be more consistent with the way I code. I try to refactor consistently after writing and committing a large module, but I panicked a little given a looming deadline. 

Thus, towards the end I only rushed to ensure the features are added, as opposed to re-purposing certain reusable functions.

The functions [handleGetEditParagraph](https://github.com/leechuanxin/made-in-sg/blob/main/routes.js#L263) and [handlePostEditParagraph](https://github.com/leechuanxin/made-in-sg/blob/main/routes.js#L408) had similar Promise chains at the beginning, so those can be written as modules to avoid repeated logic instead.

### Other questions?

1. For generating random street names, I found a [large .txt file](https://raw.githubusercontent.com/leechuanxin/made-in-sg/main/data/txt/sg_streets.txt) downloaded as a `.zip` from [Geonames.org](http://download.geonames.org/export/zip/). Initially, I [cleaned the data up](https://github.com/leechuanxin/made-in-sg/blob/main/data/js/sg_streets.js) and converted it into a `.json` file using Node's `fs` module. Midway, I decided to use an online JSON to SQL converter to rewrite them as entries in my database. Under what circumstances should I have the data as JSON (to be read by Node's `fs`), or as SQL entries in the database?



# Process Review

### What went well?

In Project 2, I aimed for *completion* as opposed to *ambition*, so my MVP and personal Base requirements were planned to be achievable in a short amount of time.

In doing so, there were only a small gap of requirements left to complete between the MVP and the presentation date.

### What could have been better?

Managing my expectations, and also understanding that "the grass is always greener on the other side".

Despite my initial desire to keep my idea and application as simple as possible, I can't help but feel the "fear of missing out" after looking at my peers' projects. Namely, I was envious of the amount of libraries integrated by some of theirs, or the extra exploration required in complex file uploads for the others.

Additionally, I did not plan past my personal MVP and Base requirements, which made post-MVP ideation tricky for a person lacking creativity in product ideation.

Thus, my biggest problem for this project isn't answering "what to cut down", nor "how do I solve X problem technically", but "what else can I add to this project given a timeline of Y".

### What would you do differently next time?

Doing demos of my MVP to friends outside of the Bootcamp circle really helped with post-MVP ideation. Unfortunately, that came over the weekend before presentations, so it's a little late to implement some of the nice ideas offered.

Through getting people to test this MVP, I realised there were 2 directions I can build towards: (1) going crazier with randomisation and perhaps learning more about paragraph structures to randomise paragraph creation, or (2) further bringing out social behaviours in the application given that it is a *collaborative* storytelling tool.