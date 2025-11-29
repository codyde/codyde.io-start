---
title: "Infrastructure and Management as Code - Intro to vSphere API with Python"
date: '2016-11-10'
slug: vsphere-api-with-python
cover_image: 
description: I've had a few goals for learning this year. One of them has been to crack open the scripting world of Python.
---

**Note**: Much of this post is no longer valid. Keeping it for historics, but there are far better methods to use in modern vSphere versions. 

I've had a few goals for learning this year. One of them has been to crack open the scripting world of Python. Knowing that the current version's of vSphere have an incredible Python based API; but not being skilled enough to use it has been...challenging. Ultimately; I've wanted to utilize the API to create a number of detailed infrastructure level reports. I've created workarounds to complete these goals using vRealize Orchestrator - creating inserts into a SQL database that dump machine facts via custom properties. It works, its hacky, it's even kind of cool - but it's not exactly what I would call the "bread and butter" solution.

Pulling data about systems directly from the API is the right thing to do.

Ironically, I picked the months before vSphere 6.5 is released and the API interface is drastically improved, enabling consumption via REST as the best time to work on learning this "new" skill set. Ultimately, my enterprise won't be on vSphere 6.5 until at minimum Q3 next year; so these skills will be valuable for quite some time. Also; programming is like muscle - the more you work it, the better you get. exercise for the brain!

I'm off on baby leave right now, with my 6 month old who is incredibly easy and naps for 4-5 hours a day; so this week I decided it's time. I'm learning the API. What I didn't realize, is how easy it actually is. All I needed was a map...

The adventure we're going to go on - is how to get you started consuming the vSphere API, accessing the MOB, and using that MOB to get yourself a "map" to data.

Before we started though - A couple of call outs!

* I'm a novice Python programmer at best. There's probably better ways to do things I do. This is meant to show you how "I" got there; if you end up being able to do it better, more power to you! We all win when any of us gets smarter :)
* Be gentle to the noob!
* I do my Python'ing on Windows using PyCharm as an IDE. You can do most of this in Notepad if you want, but at least use Notepad++
* This is an introduction to the API. This will be an article revisited and added to often; but for now - we're going to be just dipping our feet into the pool.
* **As I mentioned above, vSphere 6.5 is coming with REST API being implemented. This will drastically change and improve consumption of the vSphere API**


With that said - lets get started!


## Requirements


Here are the items you need to get started. This is based on what I used; there are obviously alternatives - but this is what I have.
* Python 2.7
* Optional - VirtualEnv - This will let us create an isolated development environment, specifically using the packages we pull down. This is a bit overkill for simple scripting, but since I'm starting to develop bigger things more - It's something I use
* pyVmomi Python Module - Components for the Python API for vSphere, including pyVim
* atexit Python Module


If you choose to to go the virtualenv route - you can start with by pulling it down with pip, and activating a virtualenv

```bash
C:\> pip install virtualenv
</code>
```

Navigate to a directory you'd like to keep your "venvs" in; for example C:\Users\Cody\python and run the below - this will create a venv based on the name you've chosen. I'm using pyapi, because I'm clever like that.

```bash
C:\> cd C:\Users\Cody\python
C:\Users\Cody\python> virtualenv pyapi
New python executable in C:\Users\Cody\python\pyapi\Scripts\python.exe
```

Once the process completes, we'll enter our venv below...

```bash
C:\Users\Cody\python> C:\Users\Cody\python\pyapi\Scripts\activate
(pyapi) C:\Users\Cody\python> 
```

![cmd-venv-screenshot](https://user-images.githubusercontent.com/17350652/212962265-43af9d65-820f-426e-b925-cc3e847ff46f.png)

**What your CMD Window "should" look like**

Now that we're in our venv, pyapi, let's go ahead and pull down our other components - atexit and pyVmomi

```bash
C:\> pip install pyVmomi
C:\> pip install atexit
```

We now have all the components we need to start building our first connection to the vSphere API with Python!


## Let's Build Objects!


When I first started reading about Python, and starting to play - it honestly reminded me a lot of PowerShell and PowerCli/PowerNSX in a lot of ways. The biggest similarity is the concept of creating objects as variables; and then interacting with those variables via methods and functions. The language is a lot different - but once you approach Python with that mindset; thing's start falling together a bit easier. At least they did for me.

A huge help for me in getting started working with the API was looking at the [pyVmomi community samples](https://github.com/vmware/pyvmomi-community-samples). You can clone this repository, and start playing with the samples to get started beyond what I'm going to show you below. I'd highly recommend checking them out!

I've created a simple Python Script that will enumerate all the VMs in my single vCenter instance. It's very basic in nature; but it serves the purpose of demonstrating the API. No, my password is not HolyPantsAndShirtsBatman!, but it IS funny.

```python
import atexit
import ssl
from pyVim import connect
from pyVmomi import vim


def vconnect():
    s = ssl.SSLContext(ssl.PROTOCOL_TLSv1)
    s.verify_mode = ssl.CERT_NONE  # disable our certificate checking for lab
    
    service_instance = connect.SmartConnect(host="hlcoremgt01.humblelab.com",  # build python connection to vSphere
                                            user="administrator@vsphere.local",
                                            pwd="HolyPantsAndShirtsBatman!",
                                            sslContext=s)

    atexit.register(connect.Disconnect, service_instance)  # build disconnect logic

    content = service_instance.RetrieveContent()

    container = content.rootFolder  # starting point to look into
    viewType = [vim.VirtualMachine]  # object types to look for
    recursive = True  # whether we should look into it recursively
    containerView = content.viewManager.CreateContainerView(container, viewType, recursive)  # create container view
    children = containerView.view

    for child in children:  # for each statement to iterate all names of VMs in the environment
        summary = child.summary
        print(summary.config.name)

vconnect()
```


![pyapi-run](https://user-images.githubusercontent.com/17350652/212962341-4550db53-8faa-47e3-81f7-2f7f25fcfe8e.png)

 Results of API Run

The comments themselves describe pretty well whats going on within the code, but lets step through from a logical perspective -

* We import the modules we need to work with (atexit to manage our connection disconnecting, ssl to deal with our certificate "stuff", pyVmomi for the API call, and vim to work with our views).
* We define a function (vconnect) for our actual "program", or command we want to run.
* We set a few variables to disable the certificate check for our internal self signed certs. Not something you should do for production, but long hair don't care in our lab.
* We create an object called service_instance that holds our connection details for vCenter. We feed our connection details into this function directly. Many of the samples will have you import an argument parsing module so you can feed these in when you are running the .py file. This works a lot better than my example; but for showing off what's happening I wanted to hard code it this time.
* We setup our details for the disconnection of our session once the program is completed running.
* The next 6 lines are about building our view. Our view is build using methods that are build into the MOB; we'll be talking about that in the next session. Additionally - each stage of the view also corresponds to the MOB. Again, we'll talk about that in a moment.
* Once we have our view, which is comprised of all of our VM's in the environment - we run a for loop to iterate through all of them, and print out the name of the VM. We gather this name from the MOB as well!


## Remember when I said we need a map? Meet the MOB.


I knew early on how to connect to the vSphere API - but I had no idea how to gather the data I needed. Combing through the documentation; I couldn't seem to put 2 and 2 together to figure out what it meant as far as the API endpoints, and how to gather the data. It wasn't until I stumbled upon a blog post at [vcloudnine](https://www.vcloudnine.de/first-steps-with-python-and-pyvmomi-vsphere-sdk-for-python/) that everything became clear, mostly because it was spelled out for me!


#### THE API ENDPOINTS CORRESPOND TO AREAS THAT YOU CAN SEE IN THE MOB!


How do we access the MOB? _https://vcenterip/MOB_ and sign in with your vCenter Administrator Credentials.

![mob-1](https://user-images.githubusercontent.com/17350652/212962565-79f8738f-ab97-4694-b997-093ffe615daa.png)

From the vcloudnine post, we can start to understand how these items are linked in the API. Take a look at the objects we define in the original script

```python
    content = service_instance.RetrieveContent()

    container = content.rootFolder  # starting point to look into
    viewType = [vim.VirtualMachine]  # object types to look for
    recursive = True  # whether we should look into it recursively
    containerView = content.viewManager.CreateContainerView(container, viewType, recursive)  # create container view
    children = containerView.view
```

As we move through the various MOB locations (content, rootFolder) we can see that things start to match up and make sense. Enabling recursive actions allow us to go the "rest" of the way down; into childEntity and vmFolder's to see actual machines. Recursive, with the viewType set to vim.VirtualMachine tells the API to go through each of the folders, all the way down, and gather all Virtual Machine Objects in vCenter.

![childEntity](https://user-images.githubusercontent.com/17350652/212962697-b8fef37e-22e2-4be9-85ad-1960a348bf7c.png)

![vmFolder](https://user-images.githubusercontent.com/17350652/212962730-54740ccb-1603-48e3-a927-53b768849184.png)


![vm-folders-1](https://user-images.githubusercontent.com/17350652/212962801-a76a388f-482e-4fd1-aa7d-1b99c135274a.png)

![final-vms](https://user-images.githubusercontent.com/17350652/212962842-0665801d-3ed1-40d1-870c-0ecc86a28461.png)

Again, with "recursive" set to "True" in our script, Python handles all the heavy lifting of iterating through all the folder objects and gathering the VMs into a list. From there; we use our For statement to move through and extract the information we want -

```python
for child in children:  # for each statement to iterate all names of VMs in the environment
     summary = child.summary
     print(summary.config.name)
```

Which ultimately prints out all of the names of our systems by referencing the summary.config.name property. If we follow the breadcrumbs (summary, config) we can get to the point where we are able to see the other properties available for us to call.

![summary-method](https://user-images.githubusercontent.com/17350652/212962903-a59d7c2f-f047-4ee2-8caa-c4c53d9c4ecc.png)

![summary-objects](https://user-images.githubusercontent.com/17350652/212962945-597040be-dd6d-4fbd-b80e-0a936154f49e.png)

![config-objects](https://user-images.githubusercontent.com/17350652/212962977-80ba0dd9-a69e-4073-bcd9-ec73a3db602e.png)


As you can see, we have access to a number of properties we can call in python scripts. Lets put this to practical use. We can tell from our script that we are calling summary.config.name. When we look in the list, we can see the property. What if we also want to print out the guestFullName? Lets make a quick modification to our script; as well as clean things up a little bit to make it prettier when we print.

```python
for child in children:  # for each statement to iterate all names of VMs in the environment
    summary = child.summary
    print("Virtual Machine Name:        "+summary.config.name)
    print("Virtual Machine OS:          "+summary.config.guestFullName)
    print("")
```

When we run this script, we receive the following return back in our console window (truncated...)

![modified-script-results](https://user-images.githubusercontent.com/17350652/212963063-2547ad7f-9edf-4368-9707-1e48c7782747.png)

You can start to see how gathering bulk information on VM systems can start to become very easy using Python and the API. A couple cool usecases -

 	
* Dynamic page that calls a python task, and reports back VM information to users (power state, memory consumption, datastore usage)
* Write out to a CSV for bulk information gathering
* Write a blog and tell people how to do it too


I've been working on a web app for my home lab that is basically my own basic version of a platform monitor. There are a ton of tools for monitoring that would do this better; but building a web app like this is giving me some real exposure to building USEFUL Python code. I recommend checking out Flask and Django for anyone interested in doing the same!


## Change a VM Using the Python API


Reporting information is pretty interesting, but what if you wanted to change a system based on a condition? What if you wanted to power off a system? The MOB will give you the "map" to call methods as well that can perform this task.

If we jump back into the MOB, enter into a VM Object, and scroll to the bottom you can see a number of methods are available to change a VM.

![methods](https://user-images.githubusercontent.com/17350652/212963108-05ee09f8-09a1-4022-86c8-ba9698d05d4a.png)

Lets make one last quick change to our original script to demonstrate. We will iterate through our VM list, and if the name matches one we designate, we'll power it off using the PowerOffVM_Task() method.

```python
for child in children:  # for each statement to iterate all names of VMs in the environment
    summary = child.summary
    print("Virtual Machine Name:        "+summary.config.name)
    print("Virtual Machine OS:          "+summary.config.guestFullName)
    print("")
    if summary.config.name == "Orion":
        child.PowerOffVM_Task()
        print("!!Powered off Orion VM!!")
```

Normally, we'd look in vCenter to see the power status - but lets use a quick Python script we've modified off of our existing one (there are MUCH better ways to write this by the way. We're using what we have here.)

```python
for child in children:  # for each statement to iterate all names of VMs in the environment
    summary = child.summary
    if summary.config.name == "Orion":
        print("Virtual Machine Name:        "+summary.config.name)
        print("Virtual Machine OS:          "+summary.config.guestFullName)
        print("Virtual Machine Power State: "+summary.runtime.powerState)
```

Do you see what we did there? Instead of calling the same summary.config property; we used the mob to look through the other objects for power state data and called it there instead. In this case, it was in summary.runtime, undre the powerState property. Running our script promptly presents us with the following result!

Success! We've used a method within a Python script to actually change a system. More complex methods can add devices, remove devices, change memory or CPU. Options are endless!


## In Closing...


For a lot of people, I recognize that this is a pretty basic thing. For me; my journey with API's started relatively recently (2-3 years ago) and learning these new tricks is making me a more agile and knowledgeable systems engineer. Working with API's continues to open up broader doors to improved automation, and gives you another tool in your belt to work with. VMWare continues to lead the way in enabling API offerings, especially in vSphere 6.5 with the REST endpoint for most vSphere data which will dramatically simplify API operations and make them consumable by more of the community.

In the meantime, many of us won't be on vSphere 6.5 for quite some time; so building your skillset up to be able to work directly with the vSphere API is a GOOD thing. I fully believe that managing your infrastructure and management as code is going to continue to be a rising trend - and the ability to code against your infrastructure directly instead of having to click through GUI's is going to be a desire as "Platforms of Tomorrow" emerge and want to consume these API's for both management and automation tasks.