---
title: "Anatomy of my MacOS Terminal"
date: '2020-03-30'
slug: anatomy-of-my-macos-terminal
cover_image: https://user-images.githubusercontent.com/17350652/210029216-f58ee6c5-b164-4bf6-b7a2-95e8a36965a3.png
description: I spend way too much time in the MacOS terminal. Here's a few tools I've come across to make things a bit easier 
---

![image](https://user-images.githubusercontent.com/17350652/210029216-f58ee6c5-b164-4bf6-b7a2-95e8a36965a3.png)

## The MacOS Terminal - My Home Away From Home 

I spend a disgusting amount of time in the terminal these days. Whether it's working in Kubernetes, or Consul, or Nomad, or Terraform, or quickly editing files, tweaking blogs, Git, all the things. You might be thinking "I do almost all of that directly in VS Code, I don't even touch the terminal", in which case, I'm super happy for you, genuinely! I tend to fluidly move in and out of the 2 based on what I'm trying to complete at a given time. The integrated terminal in VS Code is great; but sometimes the real deal is just what I need. 

A few weeks back I went through and spent a few hours customizing my shell experience with a few addons that would help me along. Some have stuck around, others ended up not being super useful. It's worth noting that this entire journey was started by [Jon](https://twitter.com/vaficionado) perusading me to take a look at [ZSH/Oh my ZSH](https://ohmyz.sh/). Between it and [iTerm 2](https://www.iterm2.com/index.html), terminal experience has remarkably grown. 

Every so often I'll get into a Twitter thread with folks around customized terminal experiences, and everyone seems to love the conversation/debate. I figured it was a good time to throw this down in a post and share with the world! Lets jump in and take a look at a few of the things that I use on a daily basis. 

## [iTerm 2](https://www.iterm2.com/index.html)

![image](https://user-images.githubusercontent.com/17350652/210029289-e40bdacc-2357-4508-b12d-501efc723f51.png)

iTerm 2 is a highly customizable and feature loaded terminal for MacOS. There's a ton of things that it does well, but the biggest ones for me are the ability to customize the frame experience (tsparency, new windows), the font/coloring experience, the build in password manager, and most importantly the hotkeys that are available. I can't see myself ever moving off of iTerm as long as I'm on MacOS.

## [Oh My ZSH](https://ohmyz.sh/)

![image](https://user-images.githubusercontent.com/17350652/210029308-f8319c9a-a96c-4d42-94da-f0af79ef5abe.png)

The single biggest reason I use Oh My ZSH is how extensible it is - and the ability to bring in different plugins and themes. The plugins add additional capabilities directly to my prompt experience. These plugins are added by installing them in some cases; but many of the plugins are built natively into the ZSH experience. Adding new plugins is generally as easy as adding the names to the plugin stanza in the `~/.zshrc` file. An example of this is below. 

```bash
plugins=(git zsh-autosuggestions zsh-syntax-highlighting autojump fzf)
```
As you can see from the snippet above, I'm using the following plugins 

* **Git** - Let's see current reporting of the Git repository I'm working with. Commit's, untracked changes, branch I'm in, etc... 
* **ZSH-autosuggestions** - This suggests auto completion based on previously run commands. Super useful for random commands I might have forgotten. Did I mention I get a ton more command history using this setup? 
* **ZSH-syntax-highlighting** - Pretty self explanatory, this gives me syntax highlighting at a command prompt level
* **Autojump** - This one is a new favorite. Autojump learns the common directories you use, and lets you "jump" to them from any directory. It makes navigating throughout my directory structure wicked quick. 
* **fzf** - This is a terminal based fuzzyfinder, admittedly, I don't use this one as much. It's there for quickly finding files whose name matches a specific string. Typically I know where the file is and can just autojump there - but for the times where I don't know, it has it's uses. 

## [Powerlevel10k - A ZSH Theme](https://github.com/romkatv/powerlevel10k)

![image](https://user-images.githubusercontent.com/17350652/210029343-400258b4-eec0-4d15-aad0-939ab8340164.png)

Powerlevel10k (p10k) is a theme that builds on one of my favorite ZSH themes, Powerlevel9k (imagine that...). It extends many terminal styling features, creates a really _fast_ terminal, and has a ton of easy to configure customization options (really really dope configuration wizard by simply running `p10k configure`). My terminal currently displays the OS I'm running on (useful for servers that I've installed the toolchain on), the current VCS (Git) status for the directory I'm in, as well as starts my "prompt" on the next line. On the far right side, it's context aware - so if I'm running a `kubectl get pods` it understands what cluster I've currently got my kubeconfig exported to, and tells me. Same goes for public cloud operations.  

![image](https://user-images.githubusercontent.com/17350652/210029358-2e4b5c68-80ac-4162-ace8-de43a30edd40.png)

Achieving the above configuration in P10k looks daunting at first, but it really isn't so bad. After you install P10k (instructions at the header link above), you run `p10k configure` to set the style of your prompt. Once complete, you can edit your `~/.p10k.zsh` file and you're off to the races. 

To set the same `segments` (the different parts of the prompt experience) as me, you can edit this section to match up... 

```bash
typeset -g POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(
    # =========================[ Line #1 ]=========================
    os_icon                 # os identifier
    dir                     # current directory
    vcs                     # git status
    # =========================[ Line #2 ]=========================
    newline                 # \n
    prompt_char             # prompt symbol
  )
```

The right segment is for less important information, and is substantially long as it handles context notifications for a ton of different platforms (everything form public clouds, to virtualenvs, to node envs, to Kubernetes, etc...). 

The big takeaway for Powerlevel10k is that it just me a TON of useful information around the context of the environments I'm working in. I get the most value out of the public cloud/kubernetes context notification, the git notification, and the "start on new line" setting. 

## Terminal Tools 

This next section is dedicated to some basic tools that I often use from the command prompt. 

### [Httpie](https://httpie.org/) - A way better curl replacement 

![image](https://user-images.githubusercontent.com/17350652/210029383-6e0722be-c0f6-466c-8a94-2e02f9e12529.png)

**Updated after post!** I can't believe I forgot this tool! It's one of my MOST favorite tools now! I do a lot of random API _things_ often, and having a way to quickly work against them from the CLI is super nice. Curl works but has its... quirks? I really like HTTPie. Example of nice things, it natively "speaks" JSON  in thesense that I can just include key/values directly in the command line. A sample below is me working with the Consul api to add a new namespace into Consul. 

![image](https://user-images.githubusercontent.com/17350652/210029411-e71c1363-341f-4349-84e9-24657b6fa91e.png)

It's got a TON of really useful capabilities along with header manipulation (great for when I'm messing with L7 capabilities in Consul), as well as the ability to bring in/down files. This one is a **mandatory** tool! 

### [BAT (a replacement for CAT)](https://github.com/sharkdp/bat) 

![image](https://user-images.githubusercontent.com/17350652/210029489-820d148c-dbf4-4193-8ce9-3b87bb9613a0.png)

Short and simple on this one, BAT is just a cleaner, syntax sensitive replacement for the `cat` command. It's got some other cool features like being git aware, and able to output spaces/tabs, etc... I've set `cat` as an alias for bat in my `~/.zshrc` file so that it loads up every time my terminal window loads.  

### [ColorLS](https://github.com/athityakumar/colorls) 

![image](https://user-images.githubusercontent.com/17350652/210029529-08faf911-e50a-4367-af74-6d2c9603e6e8.png)

Again - simple and to the point, ColorLS is a drop in replacement for the `ls` command. I've got it customized to include ASCII images for known files types. It's also got some really useful additional features - It can output the `tree` for the current directory I'm in by appending `--tree` to the end of the command. It can give me a report on the file count (recognized/unrecognized) by using the `--report` flag. It's got a lot better sorting options as well. Aside from all that, it's a hell of a lot better to look at than the vanilla `ls` command. I've got an alias set to override the `ls` command with `colorls` instead. 

### [PrettyPing](https://github.com/denilsonsa/prettyping)

![image](https://user-images.githubusercontent.com/17350652/210029542-dff1a144-0ef6-4277-a784-84787ece2a52.png)

Prettyping is a drop in replacement for the ping command that aims to make things a bit more readable and compact. This one's just a quality of life improvement - nothing major. Aliased `ping` to `prettyping`. Winning.

## Wrapping Up

There's a ton more tools I use from a command prompt - but these are the ones that are focused around how I make my terminal experience better for me. There's a ton of tools out there, and we haven't even jumped into VIM yet and started exploring. I'd love to hear more about the tools you're all using in your terminal and how they make you more productive too! 
