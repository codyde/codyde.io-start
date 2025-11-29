---
title: "My VMWorld Session - How PG&E Is Automating Secure Environments Using NSX, vRealize Automation, and vRealize Orchestrator"
date: '2016-08-05'
slug: my-vmworld-session-how-pge-is-automating-secure-environments-using-nsx-vrealize-automation-and-vrealize-orchestrator
cover_image: https://user-images.githubusercontent.com/17350652/212960174-18b7b721-1087-4d4e-a715-775696dac512.jpg
description: A huge bucket list item for me has always been to speak at VMWorld. I'm pretty excited for the opportunity to talk about what my team has done!  
---
A huge bucket list item for me has always been to speak at VMWorld. I'm pretty excited for the opportunity to talk about what my team has done!

It's been an interesting road building the presentation out and detailing out what I specifically wanted to talk about. Ultimately I settled on Security Automation with NSX, and XaaS (Anything as a Service) and the customization's we've made via vRA with XaaS to meet our business needs. I finally completed my presentation this week, albeit a couple of days late, and am extremely satisfied with the results.

Because of corporate policy, I was unable to use the existing environment at my work to build my presentation content. So, I had to build it out in my Homelab (shoutout to [/r/homelab](http://www.reddit.com/r/homelab)!!) ! Fortunately, with the larger upgrade I just completed - that was pretty easy to square away. I leveraged my own NSX instance, vRealize Automation Instance (which included vRealize Orchestrator) and VMware platform.

Addressing security, we've been able to automate significant portions of our network security work leveraging Dynamic Security Groups in NSX; building baseline security models for application server types (IIS, Apache, SQL, Oracle, etc...) as well as build complex micro-segmentation policies much easier than in the past.

![Dynamic-Security-Group](https://user-images.githubusercontent.com/17350652/212959992-18941b22-f2e6-4e6e-8977-b015541f9f7e.jpg)

From a vRealize Automation perspective, We've fully embraced self service. The built-in self service content within vRA 6.2.1 is mostly, in my opinion, geared towards more IT knowledgeable users. Using vRealize Orchestrator workflows published via XaaS has allowed us to package up workflows in user friendly menu schemes, that capture key business requirements for us. We are able to validate accounting data via SOAP API calls to our existing internal infrastructure, interface with Infoblox via Orchestrator Plug-ins to create DNS reservations and subnets, and interface with NSX to build Network Constructs.

![vRealize-Automation](https://user-images.githubusercontent.com/17350652/212960057-8d76f727-b351-4d58-b44c-a70d3b4f1878.jpg)

![XaaS-Catalog](https://user-images.githubusercontent.com/17350652/212960109-b6cdf066-36bc-4b38-83a3-aa8c568fff1e.jpg)

I'm going to be running through some live demos of the above content - connecting into my Homelab via either Horizon View or VPN Straight into my Edgerouter. The debate is on! :)

I've included my presentation snippet below - hopefully some of my readers will pop in and say hi!

![NET7648-VMworld-Session-Title-1](https://user-images.githubusercontent.com/17350652/212960174-18b7b721-1087-4d4e-a715-775696dac512.jpg)

