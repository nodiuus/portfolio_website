---
title: test
summary: ok
published: August 9, 2026
readTime: 3 min read
category: whatever, dude
author: Nisan
tags: tag1, tag2, tag3
order: 4
---

# how did we get here?

Below is an example of some C++ that's being rendered by markdown.

![Original entry point in x64dbg](/blog/Screenshot.png)

*The entropy is really high because of the compression (another telltale sign that a binary's section has been packed)*

# THIS IS A TEST

```cpp
#include <iostream>

int main() {
    std::cout << "The Contact" << std::endl;
    return 0;
}
```

```cpp
NTSTATUS result = NtQueryVirtualMemory(
    GetCurrentProcess(),                 // Process handle (current process)
    0,                                   // Base address (passed via memory info)
    MemoryWorkingSetExInformation,       // Information class (0x4)
    workingSetInformation,               // The memory information structure
    0x2000,                              // The size of the memory structure
    NULL
);
```

The syscall uses the MemoryWorkingSetExInformation class (0x4) to populate the workingSetInformation structure with the virtual attributes of each block in the watched memory region. This process ensures that the memory's state is checked and updated.

As we explore further, we come across another decrypted pointer. This pointer references an address within the watched memory pool and contains flags and attributes related to the associated memory block.

![Original entry point in x64dbg](https://web.archive.org/web/20250503015233im_/https://blog.nestra.tech/content/images/size/w1000/2025/01/image-18.png)

*```watchedMemoryInformationPool``` initialization*



