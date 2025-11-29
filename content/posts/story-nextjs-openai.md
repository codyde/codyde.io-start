---
title: '"Write Them a Story" with NextJS and OpenAI'
date: '2023-03-15'
slug: story-nextjs-openai
cover_image: https://user-images.githubusercontent.com/17350652/225241929-1bbdfae1-7479-4e97-95f9-75382e876093.png
description: I wanted a way to show my kids the power of OpenAI, and build a bit with NextJS, and so "Write Them a Story" was born. 
---

![write them a story](https://user-images.githubusercontent.com/17350652/225241929-1bbdfae1-7479-4e97-95f9-75382e876093.png)

> The repo that I used as part of this blog post can be found here - [openai-nextjs-storygen](https://github.com/codyde/openai-nextjs-storygen). 

> You can see a running version of the page here - [Write Them a Story](https://write-a-story.buildwithcode.io)

# Introduction

A few days ago I tossed a new repo out into the ether for a project I've been tooling around with, a [NextJS 13 and OpenAI app](https://github.com/codyde/openai-next-demo), really just meant as a #LearnInPublic exercise (learn some things, share out what you did, etc...). I figured worst case some people would have a light weight scaffold to play off of, best case I'd get some feedback on making it better.  

There's a lot of content creators out there doing pretty incredible things with the OpenAI API right now. For me, I love educating on this space, and I truly believe that those who lean in this next phase of AI are going accelerate their careers. I'm also a father, and if you know me, you know that I'm pretty obsessive about wanting to teach and expose my daughters to as much technology and learning as possible (I read [Five Reasons Why My Daughters Will Learn to Code](https://medium.com/scratchteam-blog/five-reasons-why-my-daughters-will-learn-to-code-5d3017fde137) when my daughters were  young and its always stuck with me) and I was struggling with a way to show them why this matters. 

My girls love to read, so the idea hit me - I could write a web application that would generate short stories (maybe not so short when GPT-4 releases with its larger token support!) and show them how the prompt changes to create them a story ([prompt engineering](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api)). I would give them options they could select, and let the prompt change as they selected items. Thats how [Write them a story](https://writethemastory-codyde.vercel.app) was created! 

### Quick Aside - Vercel and Reducing Developer Friction

> In my day job, I spend a lot of time talking about reducing developer friction/toil, so when there's a platform that goes out of their way to reduce friction - I tend to get really fixated on it. Vercel is a great of this. This is a good moment to call out Vercel has done NOTHING free for me outside of the standard free tier at this point. There's no "incentive" to write this, just a general admirer from afar. That being said, their "Hobby" tier is pretty incredible as far as giving people a path to getting started. 

As I was writing this last night I was looking at their dashboard thinking about how easily it was to move between the different relevant interaction points of my deployment. 

![vercel-dash](https://user-images.githubusercontent.com/17350652/225454310-40b3f0d6-b574-4efc-9866-826227ff8090.png)

From the work they've done on simplifying the "Getting Started" experience with NextJS, enhancements they've done around Edge/Serverless runtimes, and my God - the [ANALYTICS](https://vercel.com/analytics) experience. You can't help but assume they've intentionally looked at the common workflows associated with deploying applications and worked on smoothing out the sharp edges. The overall enhancements of NextJS 13.2 alone deserve their own post. 

Well done Vercel. Ok, back to "Writing my Kids a Story".

## Write Them a Story - How it works 

There are a few components in place as part of this application: 
* [NextJS 13.2](https://nextjs.org/blog/next-13-2) 
* [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI kit that uses TailwindCSS (discovered thanks to [this Tweet from Guillermo Rauch](https://twitter.com/rauchg/status/1622373766910316545))
* [Loaders](https://uiball.com/loaders/) for loading icons throughout (when you click submit, etc...)
* [OpenAI API](https://platform.openai.com/docs/introduction)
* [Vercel](https://www.vercel.com) for hosting
* [Vercel Edge Runtime](https://vercel.com/blog/introducing-the-edge-runtime) 

The application is setup to take a series of inputs, do string interpolation to inject those into a prompt string, call a `fetch` to the API endpoint, and the response is streamed back to the client. I output the response to a `ScrollArea` element.

### The Prompt Element

My original application took a simple input field, fetched against the api, and did an `await` for the response back. More on that in a moment. I wanted to narrow down the focus on the input area, so I created a few UI elements that I could use to build the object off of - `Name, Age, Gender, Tone, Feeling`

![inputs](https://user-images.githubusercontent.com/17350652/225453978-6d856061-f753-420f-9a27-f7ef8df44f1b.png)

Each of these form objects are tied to a React State (small set of examples below) 

*/page/index.tsx*
```javascript
<Select onValueChange={(e) => setFeeling(e)}>
    <SelectTrigger className="w-5/6">
        <SelectValue placeholder="About Feeling..." />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="confident">Confident</SelectItem>
        <SelectItem value="brave">Brave</SelectItem>
        <SelectItem value="strong">Strong</SelectItem>
        <SelectItem value="smart">Smart</SelectItem>
        <SelectItem value="kind">Kind</SelectItem>
    </SelectContent>
</Select>
```

*/pages/index.tsx*
```Typescript
const [name, setName] = useState<string>("");
const [gender, setGender] = useState<string>("");
const [feeling, setFeeling] = useState<string>("");
const [age, setAge] = useState<string>("");
const [tone, setTone] = useState<string>("");
```

As these are populated, I populate a state object (`text`) for the overall prompt, which is set via a `UseEffect`

*/pages/index.tsx*
```javascript
useEffect(() => {
    setText(`Write me a story in a tone that is ${tone}. Make it about a ${gender} named ${name}. The story should be about feeling more ${feeling}. Use appropriate language for a ${age} year old.`)
  }, [tone,gender,name,age,feeling])
```
You can also see the prompt that we've built here as well. There's definitely some optimizations I could make on this, and likely will - but it gets the job done. 

Once thats constructed, we're ready to hit `Submit` and cruise along! 

### The Fetch Call 

> First things first, HUGE thanks to [Hassan](https://twitter.com/nutlope) again for this portion. Hassan paved the way on building out the first API calls I learned for OpenAI, and a lot of the calls I use in here are directly lifted from his [TwitterBio](https://www.twitterbio.com) project. Thank you for your contributions Hassan! 

I've created an api endpoint within the `pages/api` directory called called `generate.ts`. We'll get back to that in a moment, but we call this API endpoint from our "client" (`/pages/index.tsx`) using this `fetch` call:  

*/pages/index.tsx*
```TypeScript
const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
    "Content-Type": "application/json",
    },
    body: JSON.stringify(prompt),
});

const result = response.body;
```

As you can see above, we're calling the `generate` endpoint from here. This endpoint is powered by 2 separate files. Firstly, we have a helper file at `/lib/OpenAIStream.ts` that defines out our overall payload call (and ultimately returns the `readableStream`). Theres A LOT going on in this file, but the part I really want to call out is where we structure out the interface/payload for the OpenAI payload object: 

*/lib/OpenAIStream.ts*
```TypeScript
export interface OpenAIStreamPayload {
    model: string;
    messages: ChatGPTMessage[];
    temperature: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
    max_tokens: number;
    stream: boolean;
    n: number;
  }
```
These are the fields that want to tell our application are required to provide as part of our call. Inside of this same file, we have our actual `fetch` call for the OpenAI API:

*/lib/OpenAIStream.ts*
```typescript
const res = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAITOKEN ?? ""}`,
    },
    method: "POST",
    body: JSON.stringify(payload),
});
```

We pass the payload object into this fetch call, which returns our stream. The application itself has additional code to support processing the actual stream. I highly recommend diving into the repo to check it out for more details. It's a lot to cover in this post. 

The actual API endpoint is defined within `/pages/api/generate.ts` which translates to the `/api/generate` endpoint we ran a `fetch` `POST` against in our client. In this specific implementation, we're running this as a [Vercel Edge Runtime]() for the streaming API support. We're not going to cover the entire file here, but a few specific parts worth calling out: 

In the earlier parts of the component, we set the config to run in the edge runtime. 

*/pages/api/generate.ts*
```typescript
export const config = {
  runtime: "edge",
};
```

And then the actual `handler` function that makes the call to OpenAI: 

*/pages/api/generate.ts*
```typescript
const handler = async (req: Request): Promise<Response> => {
  const prompt = await req.json()

  console.log(prompt)

  if (!prompt) {
    return new Response("No prompt in the request", { status: 400 });
  }

  const payload: OpenAIStreamPayload = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 1,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 4000,
    stream: true,
    n: 1,
  };

  const stream = await OpenAIStream(payload);
  return new Response(stream);
};

export default handler;
```

Pay special attention to the `OpenAIStreamPayload` section; here you can see us configure all the components of our actual outbound API call, based on the interface we defined earlier. This is where we set concepts like the `model`, feed in the `message`, configure the OpenAI tuning options, and enable `stream`. It's VERY much worth reading the [API documentation](https://platform.openai.com/docs/api-reference/completions) for this section, as there are very valuable configuration items to place. When `GPT-4` releases its API, this is the section we'll modify. 

The way this is configure is to return the readableStream, which passes the response back to the client as OpenAI generates it. Alternatively, we could await the regular API call back and set `stream: false` - but the streaming response gives us the real time feedback of OpenAI.

![openai typeahead](https://user-images.githubusercontent.com/17350652/225373388-a4b24343-b0f1-4f7f-9e9f-429a66de40e6.gif))

### A Note on NextJS 13.2 / App Directory / Edge Runtime

> Initially, I wrote the application using NextJS 13.2's app directory feature, however, while it would work fine locally, once I moved the project into Vercel I couldn't get the Edge Runtime to return the streaming response successfully. I'd receive a `500` error. I could remove the edge runtime config and let it run on the standard serverless function runtime successfully, however on Vercel's hobby tier it expires after 10 seconds so I wasn't able to get a full return. Ultimately since Hassan had it working on the `pages` config, I moved back to the pages directory configuration. **If you're reading this and you know the answer, drop me a comment below!** I have a strong feeling this is a gap in my own knowledge.

## The #LearnInPublic Part of This

I talk a lot about how much I learned from Hassan's projects in this post (I might get shirts made regarding being part of that guy's fan-club at this point) - but that learning as been mostly me taking the knowledge he's graciously shared. I'd love critiques, discussion, and perspectives on what I've done here and ways it could be made better from the overall LearnInPublic community! 

A couple aspects I want to look into are:

* **Input defense** - How do i sanitize the prompts to prevent bad actors from slamming things in there they shouldn't? I can think of a few hacky ways to do it - but I feel like theres something better...
* **Constructing the prompt within the API** - Someone could pretty easily do a post against the API and run their own queries. I'd rather construct the prompt server side to defend against that.

Aside from that - I'm thinking of the next ways I want to build examples into this. My youngest loves dogs. Maybe a dog facts app is in order! 