---
title: "What's in the Box? CodyDe.io Edition"
date: '2023-01-17'
slug: whats-in-the-box
cover_image: https://user-images.githubusercontent.com/17350652/213104964-1ab8c3b0-ca95-4778-beba-117fa9c9436a.png
description: A very different site setup than I've ran before. Svelte + GitHub as a CMS. Running in Netlify. Read more to learn why, and what's next.  
---

<img width="607" alt="My Site" src="https://user-images.githubusercontent.com/17350652/213104964-1ab8c3b0-ca95-4778-beba-117fa9c9436a.png">

## The TL;DR 

Currently im running the following configuration... 
* [Swyxkit](https://github.com/sw-yx/swyxkit), a customized version of [Sveltekit](https://kit.svelte.dev/)
* This configuration includes a number of customizations, but one of the major standouts is using GitHub as a CMS for the site 
* Hosting the stack in Netlify 

Details are below! 

## There and Back Again, A Website Tale 

I've had a few different blog configurations now. From Wordpress, through Jekyll, through Hugo. Hosted vs statically generated. I took a LONG break from blogging while the whole kids and family and work and all the things happened. When I first started thinking about it, I wanted to do something a bit different overall. In my last post I talked about [Building Your Own Corner of the Internet](https://codyde.io/your-corner-of-the-internet) and how I wanted this to come together. 

Since it's VERY different from prevous setups, I thought it wuld be a good idea to throw a few notes together about why its setup how it is. This is less of a story post, and more of a "Here's what it is and why" as a list. 

## Blog Framework / Theme 

<img width="576" alt="CleanShot 2023-01-17 at 22 54 49@2x" src="https://user-images.githubusercontent.com/17350652/213104472-3b90c038-2bcc-450f-ad22-8792bd079d25.png">

I'm using [Swyxkit](https://github.com/sw-yx/swyxkit) which is a customization on top of [Sveltekit](https://kit.svelte.dev/). I wanted to explore something beyond my typical React approach, and Svelte is getting a ton of tractiion in the community., with [developers giving it significant praise (second highest in the Stackoverflow developer survey in 2022)](https://survey.stackoverflow.co/2022/#section-most-loved-dreaded-and-wanted-web-frameworks-and-technologies). It's learning curve isn't too steep, and performance has been a pretty incredible increase. 

It also doesn't hurt that I can pull [LaunchDarkly in easy enough](https://docs.launchdarkly.com/guides/infrastructure/svelte) using the JavaScript SDK. 

The theme uses [TailwindCSS](https://tailwindcss.com/) which I know is a bit of a controversial topic; but im a big fan. I tend to use it in most of my projects now as it just speeds up development a ton. 

### GitHub as a CMS 

<img width="741" alt="Github CMS" src="https://user-images.githubusercontent.com/17350652/213104228-aa5448db-833a-4b97-87bc-f9c1634820cf.png">

Swyxkit adds a lot of useful components, one of the more interesting is the idea of using [GitHub as a CMS](https://www.swyx.io/github-cms). Markdown was fine on the previous site, but it never really "clicked" with me, and I wanted to way to author from any device. Using GitHub issues works pretty well for this. 

I open an issue, add some specific Frontmatter, and when the blog post is ready I toss a "Published" Label on it - and we're good to go. I'm going to expand the site out to hold a few different topics, and my plan is to use this same label system to filter based on that. I've got a few topics I want to write about - Home Automation, Code Snippets, and BBQ (one of these is not like the other....). 

Swyx has done a ton of great groundwork here around integrating GitHub comments into the comments the blog, as well as pulling in reactions and such into the articles. Bringing images in is as easy as pasting into the GitHub issue and letting it upload. 

### Hosting in Netlify 

<img width="631" alt="Netlify hosting" src="https://user-images.githubusercontent.com/17350652/213104036-e5e45c0a-a421-4f53-a896-01ff2025b6e8.png">

I've been a huge fan of Netlify for quite sometime. I've ran several workshops both internally and externally at LaunchDarkly using it, and have been thrilled with the performance. Generous free tier makes this easy to kick into gear. I ran into zero friction getting it going right out of my GitHub repo, and builds are automatic whenever I commit a change (pretty much tablestakes these days).  


## Wrapping Up 

I like having a site that doesn't just function as my corner of the internet, but also gives me a place I can learn new technologies within. This gives me the opportunity to get a bit closer to Svelte, which is something I want to dig into more in the next year, as well as make my content creation flow fairly lightweight. This post wasn't meant to be a technical deep dive, instead, more of a high-level of how this is running. 