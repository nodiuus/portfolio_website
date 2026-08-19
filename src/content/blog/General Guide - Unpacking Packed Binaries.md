---
title: "General Guide: Unpacking Packed Binaries"
summary: "A general guide to identifying and unpacking packed Windows binaries using dynamic analysis, x64dbg, and Scylla."
published: October 15, 2025
authors:
  - Nisan
tags: reverse-engineering, technical
readTime: 12 min read
order: 100
---

## What is a "packed binary"?

When I say "packed binary", I mean a binary that's been packed by a software protector/packer such as [VMProtect](https://vmpsoft.com), [Themida](https://www.oreans.com/themida.php), or [UPX](https://upx.github.io/).

## How do packers work?

Software packers work by compressing the executable with a compression library such as [zlib](https://www.zlib.net/) or [lz4](https://lz4.org/) and then injecting a stub into the program that unpacks it at runtime.

Because of this, static analysis is all but useless since all you're seeing is the unpacker stub, not the actual assembly of the binary. The best way to approach this is by using dynamic analysis.

Dynamic analysis requires you to inspect the program at runtime. This is best done with the use of a debugger. Personally, I use [x64dbg](https://x64dbg.com/) since it's extremely easy to use and has a myriad of tools that the user can utilize at any given moment in debugging.

## How do you identify a binary that's been packed?

There are a few ways to identify what type of packer packed the binary you're reversing. By far, the easiest and quickest method to identify whether or not a packer is being used is by using a tool called [Detect It Easy (DIE)](https://github.com/horsicq/Detect-It-Easy).

![Article image 1](https://media.licdn.com/dms/image/v2/D4E12AQHqEiftM0aYuw/article-inline_image-shrink_1000_1488/B4EZjPyTIBHoAQ-/0/1755832726609?e=1788393600&v=beta&t=gI5FpZ5S_0GPvS5t6I_CXFesDcmT1b9tVTKyY0SkB9o)

Here's a sample that I packed with VMProtect. DIE immediately picked up on which packer was used to pack the binary.

![The entropy is really high because of the compression (another telltale sign that a binaries section has been packed)](https://media.licdn.com/dms/image/v2/D4E12AQGF8Pd3km4o3Q/article-inline_image-shrink_1500_2232/B4EZjPy2VPGoAU-/0/1755832870823?e=1788393600&v=beta&t=kGLCy_l95yo8blUI0qxCFrP7j8L_Mj1IfAXAYgzzY5U)

The entropy is really high because of the compression (another telltale sign that a binaries section has been packed)

## Unpacking the binary: Part 1

Now, let's take a look at it in x64dbg.

![Article image 3](https://media.licdn.com/dms/image/v2/D4E12AQEy4QJhg6ceBw/article-inline_image-shrink_1000_1488/B4EZjTb4f4HEAU-/0/1755893959654?e=1788393600&v=beta&t=kyYHEwdiT4fqoOHjEz2n_5-1LHFw28DyeolN8qToRaM)

Running it once, we're brought to the "entry point" of the program. Since this is a packed binary, we can assume this isn't the real entry point. What we're looking at right now is the unpacking routine.

Before we run it again, let's take a look at what .text looks like.

![Article image 4](https://media.licdn.com/dms/image/v2/D4E12AQFuUQonjjzpCg/article-inline_image-shrink_1500_2232/B4EZjTekhcGYAU-/0/1755894664105?e=1788393600&v=beta&t=95ef2i2wcX0x-a7VXWzOmCWvzAoDCbCp8jfAFczvzjg)

Looks like a bunch of null bytes and padding, right? That's because the unpacking routine hasn't actually run yet. Let's run it one more time and see what happens.

![Article image 5](https://media.licdn.com/dms/image/v2/D4E12AQFxdkp-Y40-kg/article-inline_image-shrink_1500_2232/B4EZjTfDgTHEAU-/0/1755894790891?e=1788393600&v=beta&t=M1kqlpbEghyHW7LHPFu7BYuJJpTW3zIye8ywUffW7KA)

After running it one more time, the unpacking routine has run, and .text has been populated with the decompressed content of the original binary.

Great! Doesn't this mean we can dump the entire .text region and get a valid, unpacked binary out of this? Not quite.

We first have to find the original entry point of the program so that when we dump it, our binary knows where to start executing code from.

## Entry points

Let's backtrack to the entry point thing I mentioned earlier. Binaries that are compiled on Windows technically have two entry points. We can inspect this behavior by using a disassembler/decompiler like [IDA](https://hex-rays.com/) or [Binary Ninja](https://binary.ninja/).

![Article image 6](https://media.licdn.com/dms/image/v2/D4E12AQFsRbjHcNy1PQ/article-inline_image-shrink_400_744/B4EZjTmPK.HgAY-/0/1755896673369?e=1788393600&v=beta&t=MnMyGs5wVXNdMlwejxQ5ZewdzGAuFtxJC6lLlGbFMxI)

Here's the first entry point of the program. This is what is run before the binary's actual entry point. This "entry point" comes from Microsoft's C runtime and is compiled into the binary at build time. It is responsible for setting up the runtime environment (stack alignment, security cookie, exception handling, etc) and then invoking the binary's main function, AKA, the second entry point of the program.

Let's analyze one of the functions that the first entry point calls, specifically `sub_1400016A0`.

![Article image 7](https://media.licdn.com/dms/image/v2/D4E12AQFX6lAxLiG_8Q/article-inline_image-shrink_1500_2232/B4EZjUhI3.GYAU-/0/1755912114495?e=1788393600&v=beta&t=Ne6BeMs42eZrxMgv_EsLKDxc7qKvqHNJHMc6zil4p9M)

Microsoft's C runtime inserts this at build time to stop buffer overflows. Since this function can be found in almost any Windows compiled binary, theoretically, we can set a breakpoint on one of the functions that `sub_1400016A0` calls and then get the references to the C runtime entry point. To test this, I'm going to set a breakpoint on GetSystemTimeAsFileTime in x64dbg.

### Unpacking the binary: Part 2

To set a breakpoint on GetSystemTimeAsFileTime in x64dbg, go into the Symbols tab, go to the kernel32.dll module, and then search for the symbol "GetSystemTimeAsFileTime".

![Article image 8](https://media.licdn.com/dms/image/v2/D4E12AQGfMNIuwrLMpg/article-inline_image-shrink_1000_1488/B4EZjUufToHIAQ-/0/1755915613825?e=1788393600&v=beta&t=waelKJnecknug_PavaA4ez0bzTRZLXtc7abdNnKstz0)

Double-click the symbol and then set a breakpoint on the jump.

![Article image 9](https://media.licdn.com/dms/image/v2/D4E12AQHmbCXZVvNFsw/article-inline_image-shrink_1500_2232/B4EZjUu6rYGcAU-/0/1755915726209?e=1788393600&v=beta&t=qc_fYAyvIltc9t95tBd91YlQtCEFYGzBEhwow6KNwsw)

Now, continue to run the binary until it hits the breakpoint and RIP is in .text.

![Article image 10](https://media.licdn.com/dms/image/v2/D4E12AQF87VqC4IYMhA/article-inline_image-shrink_400_744/B4EZjUv0n9GwAY-/0/1755915963334?e=1788393600&v=beta&t=4WC9rRv6OIgKWDfndBX9DucbjBDbgM9CbGTs0cgqTkE)

Now head to the top call on the call stack. That should lead you to the function we were looking at before.

![Article image 11](https://media.licdn.com/dms/image/v2/D4E12AQH_i6z8f_CwZA/article-inline_image-shrink_1500_2232/B4EZjUwlDLHoAc-/0/1755916161873?e=1788393600&v=beta&t=7kOJgcAWZH6CnxmgkyOa3zJpBv1C836E-m9STlEDCO8)

It brings us here. Let's check references to the first instruction in the function.

![Article image 12](https://media.licdn.com/dms/image/v2/D4E12AQHEZ10gkvyWaQ/article-inline_image-shrink_400_744/B4EZnpg77gHcAY-/0/1760559349954?e=1788393600&v=beta&t=IpCzIsM-wcxl7TQzML0ZpYktyF75dCdPcxxUx2aJziU)

To check for references, press CTRL + R in x64dbg.

![Article image 13](https://media.licdn.com/dms/image/v2/D4E12AQGroIrQU2u21g/article-inline_image-shrink_1500_2232/B4EZjUxJ_HGwAU-/0/1755916312835?e=1788393600&v=beta&t=1KfwuUlLoz13n2K9I30ej7XtLYNVlubv4Vy6EHYoLgg)

Jackpot.

![Article image 14](https://media.licdn.com/dms/image/v2/D4E12AQFXWHn4oXGDrg/article-inline_image-shrink_400_744/B4EZnpZ8LFJgAc-/0/1760557515910?e=1788393600&v=beta&t=q1Vj8GS0H4oTliS9KOombJxQl16YRKB02Fp7Hno0Yak)

We're brought to this function, which looks like the first entry point we discussed. All we have to do now is go through the jmp ("jmp packed-me.vmp.7FF6CEEB1FE4") and look for some calls to "argv" and "argc".

![Article image 15](https://media.licdn.com/dms/image/v2/D4E12AQHQkvjXeBPprg/article-inline_image-shrink_1000_1488/B4EZnpaZzmKkAQ-/0/1760557637177?e=1788393600&v=beta&t=CqyjOcqPMdGvrYhyTEJOBLSjsQK6Ay1bF10fuH-f3UY)

After some scrolling, we found the two calls to "argv" and "argc" we were looking for.

Now, all we have to do is go into the call right after those aforementioned calls. In this case, we're going to go into the "call packed-me.vm.7FF6CEEB1420" call.

![Article image 16](https://media.licdn.com/dms/image/v2/D4E12AQE1l-fln7eyEQ/article-inline_image-shrink_1000_1488/B4EZnpbGOcKgAQ-/0/1760557819335?e=1788393600&v=beta&t=1qIu6hXFHo5hi3qqnYqVqyLWcVddtDaehd9qFYe-9MY)

Just like that, we've found the OEP. Now all we have to do is set a breakpoint at the very top of the function ("sub rsp, 68") and run the program until it hits that breakpoint. Or, you can manually set RIP to that instruction.

To dump and fix the binary, we're going to use Scylla, which comes built into x64dbg.

![Article image 17](https://media.licdn.com/dms/image/v2/D4E12AQFg6aGCHID-Pw/article-inline_image-shrink_1000_1488/B4EZnpcAeQHoAQ-/0/1760558057745?e=1788393600&v=beta&t=xemlb5h3iHbGpSvxZKhjCtSjmAoQoCuhEuV9axr1N5U)



![Article image 18](https://media.licdn.com/dms/image/v2/D4E12AQGc-oczM6dt3Q/article-inline_image-shrink_1000_1488/B4EZnpcOFiIMAQ-/0/1760558113446?e=1788393600&v=beta&t=rYgxvsVyG_dQBAfyThC74-O5Pa5kkVIsnoCaKbmeyaw)

Click on IAT Autosearch, and it should fill out the VA and Size fields.

![Article image 19](https://media.licdn.com/dms/image/v2/D4E12AQH1PxuwdublzQ/article-inline_image-shrink_400_744/B4EZnpcT5.HEAc-/0/1760558137324?e=1788393600&v=beta&t=ge8A-FhqQGv2COiYLH8EeSvK7HnQ9bNQMkslR3teblY)

Next, click Get Imports.

![Article image 20](https://media.licdn.com/dms/image/v2/D4E12AQHf1QiETWS3RQ/article-inline_image-shrink_1000_1488/B4EZnpcZ2wGcAU-/0/1760558161656?e=1788393600&v=beta&t=hG_8_QRO1PMjkIxkzOFXjXErymSBzUc1RJ3LpWpAA1Q)

A bunch of imports should appear after clicking that button. All you need to do now is right-click the invalid FThunk and remove it by clicking "Delete tree node".

![Article image 21](https://media.licdn.com/dms/image/v2/D4E12AQEiD_qla6r6cA/article-inline_image-shrink_400_744/B4EZnpcoSKHEAY-/0/1760558220727?e=1788393600&v=beta&t=n_Z-0Qo_kvai_HZAqmfJB7GFNjyxlBK1GAGrXr8g5F4)

Finally, you can dump the executable by clicking "Dump".

![Article image 22](https://media.licdn.com/dms/image/v2/D4E12AQEGKgAfHkN2AA/article-inline_image-shrink_400_744/B4EZnpduksIIAc-/0/1760558508642?e=1788393600&v=beta&t=Kj2OVJ4Yg9qrGXhPQAzTuVVhbdBnHUsaZ7DHVMr4WB0)

You must fix the dump right after dumping, so click "Fix Dump" and fix the dump that you created earlier.

After that, you should have an unpacked binary that's easier to reverse statically.

![Article image 23](https://media.licdn.com/dms/image/v2/D4E12AQHYna3w8hP4UQ/article-inline_image-shrink_1500_2232/B4EZnpfO9sIIAY-/0/1760558903626?e=1788393600&v=beta&t=ggqllIOsChjhWwdzJYrRhLuAw-xpKfxQxOHpbs0-7uw)

## Conclusion

I hope that this is useful to whoever may stumble upon this article. If there is something that I left unclear in this article, please feel free to PM me so that I can fix the wording or clarify what I mean.

More articles coming soon! I might write something about obfuscation.
