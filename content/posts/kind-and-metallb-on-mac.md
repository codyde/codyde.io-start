---
title: "KIND and Load Balancing with MetalLB on Mac"
date: '2020-12-04'
slug: kind-and-metallb-on-mac
cover_image: https://user-images.githubusercontent.com/17350652/210028978-7174f565-485a-4841-9452-f14624703138.png
description: Kind and MetalLB allow you run Kubernetes clusters within Docker and deploy Load Balancers - but theres a few tricks to get it up and running.
---

![kind](https://user-images.githubusercontent.com/17350652/210028978-7174f565-485a-4841-9452-f14624703138.png)

### Updated 12/4/2020

A couple of the finer points of this configuration have changed since it was originally written. For example aspects of the homebrew installation of tuntap have changed. I updated the post and did a sanity run through - updating a few of the steps for better clarity. Since I did this, I’ve also bumped the date of this post to be current as well.

### Introduction

Minikube and Docker for Desktop generally provide an "OK" experience for testing Kubernetes based *things* locally - but I really like the ability work against multiple nodes for some cases (i.e. I was doing some experimentation with daemonsets recently). Enter [KIND](https://kind.sigs.k8s.io/)! KinD (or Kubernetes-in-Docker) is one of the Kubernetes SIG projects (Special Interest Groups), and represents a tool for deploying Kubernetes clusters inside of Docker. Super useful for doing Kubernetes things locally!

A ways back, I had discovered [MetalLB](https://metallb.universe.tf/) as a method for getting an easy load balancer on-premises for Kubernetes. In the public cloud world - getting services into a cluster and subsequent load balancer connectivity is pretty easy. It gets a bit more nebulous (or, expensive...) on-premises.

The problem I found however is with how MacOS handles Docker. Since MacOS leverages [Hyperkit](http://collabnix.com/how-docker-for-mac-works-under-the-hood/ for virtualization, the interfaces for Dockers bridge network aren't actually routable interfaces - you're actually connecting to a socket instead. Immediately upon starting to research, I found that the Great and Powerful [Duffie Cooley](https://twitter.com/mauilion) had done a blog on [just this topic, but from the Linux point of view](https://mauilion.dev/posts/kind-metallb/). In the Linux world, the docker0 bridge network is directly connected - allowing you to interact from a network perspective seamlessly.

Fortunately, I wasn't the only one looking at how to do this, and someone else far smarter solved it!

## The Solution

Ultimately what was needed was a way to hit the docker0 bridge network. Hyperkit supports this functionality through a specific set of additional arguments used during the creation of the machine. This isn't possible out of the box since it's actually Docker that's creating the machine, and the commands are hard-coded in that way. While digging - I discovered a GitHub project that was working on this specific use case for Docker - [docker-tuntap-osx](https://github.com/AlmirKadric-Published/docker-tuntap-osx).

This shim install allows a bridge network to be created between the host and guest machine. Subsequently, a gateway address is created that can then be used to route against to hit cluster services inside the docker networks.

There are caveats however...

* It's hacky and unsupported, and you should **use kubectl proxy or port forward if at all possible**
* Every time your machine restarts you'll need to reapply the shim and restart docker
* I experienced having to remove the static route and re-add after periods of non-use. The route would be there but it suddenly wouldn't work.

Let's dive in!

## Getting Started

All and all, this is a pretty quick thing to pull off. In order to knock this out, we're going to do the following

* Clone down the repo I covered above - [AlmirKadric-Published/docker-tuntap-osx](https://github.com/AlmirKadric-Published/docker-tuntap-osx)
* As mentioned in the instructions within that GitHub, use brew to install tuntap (`brew tap homebrew/cask` followed by `brew cask install tuntap`). You may need a restart after this - but I didn't on my system
* Exit out of Docker for Mac
* Once these 2 things are complete, we can execute the shell script, ./sbin/docker_tap_install.sh. **It's important to NOT execute this command with sudo. If you execute it with sudo, the interface will be created under the root user, and the functionality will not work.**  
* Once the tap is installed, we will bring the interface up
* We can assign a static route against the gateway on that interface to provide routing into the our KIND environment, and ultimately MetalLB.
* Finally - we'll install/configure MetalLB into our Kubernetes cluster

As usual, you should always be wary about executing arbitrary scripts. I'd highly recommend reviewing the script to ensure you're comfortable with what it's doing.

Execute the ./sbin/docker_tap_install.sh script

```bash
./sbin/docker_tap_install.sh
Installation complete
Restarting Docker
Process restarting, ready to go
```

Once Docker finishes restarting, you can grep your interfaces looking for tap to see that the tap interface has been created.

```bash
ifconfig | grep "tap"
tap1: flags=8842<BROADCAST,RUNNING,SIMPLEX,MULTICAST> mtu 1500
```

With this in place, we can run the script that will bring our TAP interface "up" in order to set our connectivity to the docker network up. Note that there are a few things in this file that you might want or need to change. The script currently uses the default Docker network, but in some cases this might change. I've provided the output of my `docker_tap_up.sh` script below for comparison:

```bash
❯ cat sbin/docker_tap_up.sh
  #!/bin/bash

  set -o nounset
  set -o errexit

  # Local and host tap interfaces
  localTapInterface=tap1
  hostTapInterface=eth1

  # Local and host gateway addresses
  localGateway='10.0.75.1/30'
  hostGateway='10.0.75.2'
  hostNetmask='255.255.255.252'

  # Startup local and host tuntap interfaces
  sudo ifconfig $localTapInterface $localGateway up
  docker run --rm --privileged --net=host --pid=host alpine ifconfig $hostTapInterface $hostGateway netmask $hostNetmask up
```

You may want to (based on your environment...) update the localGateway and/or hostGateway settings, but they should work as default.

When satisfied, execute `./sbin/docker_tap_up.sh` and when it completes run an `ifconfig`. If we scroll to the last interface, it should be tap1, and you should see the network assigned

```bash
tap1: flags=8843<UP,BROADCAST,RUNNING,SIMPLEX,MULTICAST> mtu 1500
    ether 12:68:9b:00:c2:22
    inet 10.0.75.1 netmask 0xfffffffc broadcast 10.0.75.3
    media: autoselect
    status: active
    open (pid 11096)
```

With that portion configured, we're going to break from our networking journey for a brief moment to get our KinD cluster up and running.

## Deploying our Cluster with KIND

[Eric Shanks](https://twitter.com/eric_shanks) dropped a blog post a ways back around [A Kind Way to Learn Kubernetes](https://theithollow.com/2019/10/07/a-kind-way-to-learn-kubernetes/). It's a great read on the in's and out's of getting KIND up and running and. Knowing that that's there to read - I'm going to be pretty brief in how to get our cluster up and running.

```bash
cat << EOF > config.yaml
kind: Cluster
apiVersion: kind.sigs.k8s.io/v1alpha3
nodes:
- role: control-plane
- role: worker
- role: worker
- role: worker
EOF
kind create cluster --config config.yaml
```

If all goes well, you should see results similar to below...

```bash
❯ kind create cluster --config config.yaml
Creating cluster "kind" ...
 ✓ Ensuring node image (kindest/node:v1.18.2) 🖼
 ✓ Preparing nodes 📦 📦 📦 📦
 ✓ Writing configuration 📜
 ✓ Starting control-plane 🕹️
 ✓ Installing CNI 🔌
 ✓ Installing StorageClass 💾
 ✓ Joining worker nodes 🚜
Set kubectl context to "kind-kind"
You can now use your cluster with:

kubectl cluster-info --context kind-kind
```

KinD will automatically add it's kubeconfig information to your existing contexts and you should be off to the races. You can validate this, as well as the network your nodes are running on (this will be imporatant in a bit...) by running a `kubectl get nodes -o wide`, which should give you an output similar to below:

```bash
❯ kubectl get nodes -o wide
NAME                 STATUS   ROLES    AGE    VERSION   INTERNAL-IP   EXTERNAL-IP   OS-IMAGE       KERNEL-VERSION    CONTAINER-RUNTIME
kind-control-plane   Ready    master   2m1s   v1.18.2   172.18.0.2    <none>        Ubuntu 19.10   5.4.39-linuxkit   containerd://1.3.3-14-g449e9269
kind-worker          Ready    <none>   83s    v1.18.2   172.18.0.3    <none>        Ubuntu 19.10   5.4.39-linuxkit   containerd://1.3.3-14-g449e9269
kind-worker2         Ready    <none>   82s    v1.18.2   172.18.0.5    <none>        Ubuntu 19.10   5.4.39-linuxkit   containerd://1.3.3-14-g449e9269
kind-worker3         Ready    <none>   82s    v1.18.2   172.18.0.4    <none>        Ubuntu 19.10   5.4.39-linuxkit   containerd://1.3.3-14-g449e9269
```

As you can see, our nodes deployed onto a 172.18.x.x network. To use the gateway on the tap interface we created earlier, we'll add a static route into this network. This will allow us to (soon) route to our MetalLB load balancers. You'll want to validate the network KinD deployed the nodes onto in your environment. This can be done by using the `docker network ls` and `docker network inspect` commands to check your network. Kind creates a Docker network aptly called "kind", so the command you would run is `docker network inspect kind`, and look for the "Subnet" entry. In my environment, at the time of writing, it's `172.18.0.0/16` for example.

Using this information, we can create our static route with the command below,

```bash
sudo route -v add -net 172.18.0.1 -netmask 255.255.0.0 10.0.75.2
```

With this configured, we should be ready to setup our cluster and MetalLB!

## Configuring MetalLB

MetalLB has a great set of [documentation for getting started](https://metallb.universe.tf/installation/).

We'll simply execute the following command to deploy out the necessary manifests for MetalLB

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.9.3/manifests/namespace.yaml
kubectl create secret generic -n metallb-system memberlist --from-literal=secretkey="$(openssl rand -base64 128)"
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.9.3/manifests/metallb.yaml
```

This should ultimately create a number of resources within your cluster, you can run a get pods against the metallb-system namespace (_kubectl get pods -n metallb-system_) to see the resulting created created pods.

With these resources created, we'll now need to setup the actual configuration by deploying a configmap. In MetalLB, we can either deploy our Load Balancing configuration in Layer 2 mode or using BGP. Since we're doing this all locally, it doesn't really make sense for us to peer into BGP. We'll rock us some L2.

Earlier when we defined out our static route, you'll notice I used the 172.18.0.0 network as the destination for our traffic. We're going to tell MetalLB that it can also deploy load balancers onto this network. We'll use some higher IP Addresses to hopefully avoid any sort of collisions.

Create and apply the following configmap:

```bash
cat << EOF > metallb-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  namespace: metallb-system
  name: config
data:
  config: |
    address-pools:
    - name: default
      protocol: layer2
      addresses:
      - 172.18.0.150-172.18.0.200
EOF
kubectl create -f metallb-config.yaml
```

And our cluster should be ready!

## Deploying an Application

I've got a really silly application I threw together when I was at VMware still that has grown a bit since I joined HashiCorp. It's mostly setup to test Service Mesh functionality now, but it also deploys a resource on the frontend that uses a load balancer. We can use this to give things a test. 

```bash
git clone https://github.com/codyde/hashi-demo-app
kubectl apply -f hashi-demo-app/kubernetes-demoapp.yaml
```

After a few moments, you should be able to run a `kubectl get svc -n custom-application` which will list all exposed services in the cluster. If all things went well, you should see the a deployed load balancer!

```bash
❯ kubectl get svc -n custom-application
NAME       TYPE           CLUSTER-IP       EXTERNAL-IP    PORT(S)        AGE
frontend   LoadBalancer   10.110.171.147   172.18.0.151   80:30041/TCP   45s
```

Observe our frontend service behind a load balancer. Finally, if we hit it in a browser, we should have our page return!

![image](https://user-images.githubusercontent.com/17350652/210028711-f29e8277-c55f-4f5c-9880-05d05b04db65.png)

## Wrapping Up

Using KinD + MetalLB gives you a quick way to get clusters up and running and be able to deploy functional load balancing into your cluster. I use this functionality pretty much every day. Take it for a spin and let me know what you think!