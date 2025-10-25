# Kids Mode Parent Guide

**Welcome to Medio Kids Mode!** 🎬

This guide will help you set up and use Kids Mode - a safe, child-friendly way for your children (ages 4-8) to watch their favorite videos using simple gestures and NFC chips.

---

## Table of Contents

1. [What is Kids Mode?](#what-is-kids-mode)
2. [Getting Started](#getting-started)
3. [How Gestures Work](#how-gestures-work)
4. [Setting Up NFC Chips](#setting-up-nfc-chips)
5. [Managing Watch Time](#managing-watch-time)
6. [Troubleshooting](#troubleshooting)
7. [Safety & Privacy](#safety--privacy)

---

## What is Kids Mode?

Kids Mode is a **button-free** video playback experience designed specifically for young children. Instead of tapping buttons or using complex menus, kids use natural **gestures** to control videos:

- **Tilt** the device to rewind/fast-forward
- **Shake** to skip to the next video
- **Swipe down** to exit

Kids scan an **NFC chip** (small sticker or card) to start watching their assigned videos. No reading required, no accidental clicks on ads or settings!

### Key Features

✅ **No buttons** - Prevents accidental purchases, settings changes, or app exits
✅ **Watch time limits** - Automatically enforces daily screen time limits per child
✅ **Profile-based tracking** - Each child has their own profile and watch history
✅ **Safe content** - Only videos you've approved and assigned to NFC chips
✅ **Gesture controls** - Intuitive tilt, shake, and swipe gestures

---

## Getting Started

### Step 1: Create Child Profiles

1. Log in to your Medio account at **https://medio-react-app.fly.dev**
2. Go to **Settings** → **Profiles**
3. Click **"Add Profile"**
4. Enter your child's:
   - **Name** (e.g., "Alice")
   - **Age** (for age-appropriate content filtering)
   - **Daily watch time limit** (default: 60 minutes)
5. Click **"Save Profile"**

Repeat for each child in your household.

---

### Step 2: Register NFC Chips

You'll need **NFC stickers or cards** (available on Amazon for ~$10/pack). Each chip will be assigned to a set of videos.

1. Go to **NFC Manager** in Medio
2. Click **"Register New Chip"**
3. **Scan the NFC chip** with your phone (Android) OR **enter the Chip UID manually**
   - **Finding Chip UID**: Usually printed on the sticker (e.g., `04:A1:B2:C3:D4:E5:F6`)
4. Give the chip a **friendly name** (e.g., "Blue Chip - Cartoons")
5. Click **"Register"**

**Tip**: Buy different colored stickers so kids can remember which chip has which videos!

---

### Step 3: Assign Videos to NFC Chips

1. In **NFC Manager**, click the **🎬 icon** on a registered chip
2. Click **"+ Add Videos from Library"**
3. Select up to **50 videos** from your library
4. **Drag and drop** to reorder videos (they'll play in this order)
5. Click **"Save Changes"**

**Example Setup**:
- **Blue Chip**: Morning cartoons (10 videos, 20 minutes total)
- **Red Chip**: Educational videos (8 videos, 25 minutes total)
- **Green Chip**: Bedtime stories (5 videos, 15 minutes total)

---

### Step 4: Enable Gesture Permissions (iOS Only)

**Android users**: Skip this step - gestures work automatically!

**iPhone/iPad users**:
1. Open Safari and go to **https://medio-react-app.fly.dev/kids**
2. When prompted, click **"Enable Gestures"**
3. Select **"Allow"** when Safari asks for motion sensor permission
4. If you accidentally clicked "Deny":
   - Go to iPhone **Settings** → **Safari** → **Privacy & Security**
   - Toggle **"Motion & Orientation Access"** to **ON**
   - Refresh the page

---

## How Gestures Work

### Scanning an NFC Chip

1. Open **https://medio-react-app.fly.dev/kids** on your phone or tablet
2. **Select your child's profile** (if you have multiple children)
3. Hold the **NFC chip** near the **top back** of the phone (Android) or **top edge** (iPhone with NFC-enabled app)
4. Videos assigned to that chip will load and play automatically in fullscreen!

**No NFC chip?** Click **"Enter Chip ID Manually"** and type the Chip UID.

---

### Tilt to Rewind/Fast-Forward

**How it works**: Tilt the device forward or backward to scrub through the video.

- **Tilt forward** (screen facing down): Fast-forward ⏩
- **Tilt backward** (screen facing up): Rewind ⏪
- **Hold still**: Normal playback ▶️

**Tips for kids**:
- "Tilt gently like you're pouring water out of the screen"
- Small tilt = slow scrubbing, big tilt = fast scrubbing
- Works best when sitting or standing still (not while walking)

**Sensitivity**:
- **Dead zone**: 15° (prevents accidental scrubbing when phone is resting)
- **Max tilt**: 45° (fastest scrubbing speed: 2 seconds per second)

---

### Shake to Skip

**How it works**: Shake the device left or right to skip to the next/previous video.

- **Shake right**: Skip to next video ⏭️
- **Shake left**: Go to previous video ⏮️

**Tips for kids**:
- "Shake like you're saying 'no-no' with the phone"
- Shake needs to be **firm** (not gentle) - we optimized for kids' natural shaking strength!
- Wait 1 second between shakes (prevents double-skipping)

**What happens at the end?**
- **Last video**: Shaking right returns to NFC scan screen
- **First video**: Shaking left does nothing (stays on first video)

---

### Swipe Down to Exit

**How it works**: Swipe down from the top edge to exit fullscreen mode.

- **Swipe distance**: At least 100 pixels (about 1 inch)
- **Direction**: Must be mostly vertical (diagonal swipes ignored)

**Tips for kids**:
- "Swipe like you're pulling down a window shade"
- Helps prevent accidental exits from small finger movements

**What happens?**
- Video stops playing
- Returns to NFC scan screen
- Watch time is saved automatically

---

## Setting Up NFC Chips

### Where to Buy NFC Chips

We recommend **NTAG215 NFC stickers** (compatible with most Android phones):

- **Amazon**: Search "NTAG215 NFC stickers" (~$10 for 20 stickers)
- **AliExpress**: Cheaper bulk options (~$5 for 50 stickers)
- **Office supply stores**: Some carry NFC business cards

**What to look for**:
- **Type**: NTAG215, NTAG213, or ISO14443A compatible
- **Size**: 25mm circular stickers work great, credit-card size also good
- **Rewritable**: Not required (we only read the UID, don't write data)

---

### Where to Place NFC Chips

**For Android phones** (NFC antenna usually near the camera):
1. Place sticker on a **sturdy card or toy**
2. Test by holding phone's **back top edge** near the sticker
3. When it works, mark the spot with a star ⭐

**For iPhones** (NFC antenna at top edge, but Web NFC not supported):
- Use **manual chip ID entry** instead
- Print the Chip UID on the card so kids can ask for help

**Storage ideas**:
- Magnetic board with color-coded cards
- Small basket with labeled stickers
- Velcro-attached cards on wall at child's height

---

### Teaching Kids to Scan

**Visual guide** (draw on the NFC card):
1. Draw an arrow pointing to where phone should touch
2. Add a ⭐ star at the scan spot
3. Use different colors for different chips

**Practice together**:
1. Show them how to hold the phone's back near the sticker
2. Count to 3 together while holding still
3. Celebrate when videos load! 🎉

**Troubleshooting**:
- **"Nothing happens"**: Hold closer, try different angle
- **"It stopped working"**: Battery might be low, try charging phone
- **Still not working**: Use **"Enter Chip ID Manually"** as backup

---

## Managing Watch Time

### Setting Daily Limits

1. Go to **Settings** → **Profiles**
2. Click **Edit** on your child's profile
3. Change **"Daily watch time limit"** (in minutes)
   - Default: 60 minutes
   - Recommended for ages 4-6: 30-45 minutes
   - Recommended for ages 7-8: 60 minutes
4. Click **"Save"**

**How it works**:
- Limit resets at **midnight** in your timezone
- When limit is reached, video stops and shows a friendly message
- Limit is **per profile** (siblings don't share limits)

---

### What Kids See When Limit is Reached

Instead of an error message, kids see:

> 🌙 **Great job watching today!**
>
> You've watched enough videos for today. Time to play, read, or go outside!
>
> **See you tomorrow!**

**No buttons to click** - they just swipe down to exit.

**Parent override** (not in Kids Mode):
- Log in to Medio as parent
- Go to **Settings** → **Profiles** → **Edit**
- Temporarily increase limit OR reset watch time for today

---

### Viewing Watch History

1. Go to **Dashboard** → **Watch History**
2. Filter by **Profile** to see what each child watched
3. View:
   - Total minutes watched today/this week
   - Which videos they watched (and how many times)
   - When they watched (timestamps)

**Privacy note**: Watch history is only visible to you (the parent account owner).

---

## Troubleshooting

### Gestures Aren't Working

**Problem**: Tilting or shaking doesn't do anything.

**iPhone users**:
1. Go to **Settings** → **Safari** → **Privacy & Security**
2. Toggle **"Motion & Orientation Access"** to **ON** for `medio-react-app.fly.dev`
3. Refresh the page and click **"Enable Gestures"** again

**Android users**:
1. Check that you're using **Chrome or Edge** (not Firefox)
2. Make sure URL is **https://medio-react-app.fly.dev** (not http)
3. Try restarting the browser

**All devices**:
- Update browser to latest version
- Try in normal (not private/incognito) mode

---

### NFC Chip Won't Scan

**Problem**: Holding phone near chip does nothing.

**Quick fixes**:
1. **Move phone around**: NFC antenna location varies by phone model
2. **Remove phone case**: Thick cases can block NFC signal
3. **Check NFC is enabled**:
   - Android: Settings → Connections → NFC → Toggle ON
   - iPhone: NFC always on (but Web NFC not supported - use manual entry)

**Backup method**:
- Click **"Enter Chip ID Manually"**
- Type the Chip UID printed on the sticker
- Save this number somewhere safe for future use

---

### Videos Won't Play

**Problem**: Black screen after scanning chip, or "Failed to load video" message.

**Common causes**:
1. **No videos assigned**: Go to NFC Manager, assign videos to this chip
2. **Video was deleted**: The video might have been removed from YouTube/Vimeo
   - Solution: Remove invalid video, add a replacement
3. **Internet connection lost**: Check Wi-Fi or mobile data
4. **YouTube embed restrictions**: Some videos can't be embedded
   - Solution: Use different video from library

---

### Watch Time Limit Seems Wrong

**Problem**: Says limit reached but child only watched 10 minutes.

**Check**:
1. **Profile selection**: Did they select the correct profile?
   - Each profile has its own limit
   - If they selected wrong profile, time was counted elsewhere
2. **Timezone**: Limit resets at midnight in your timezone
   - Go to **Settings** → **Account** → **Timezone** to verify
3. **Yesterday's time**: Limit is daily (resets at midnight)
   - Check watch history to see when previous sessions occurred

---

### Child Can't Exit Kids Mode

**Problem**: Swipe down doesn't work, stuck in fullscreen.

**Emergency exit**:
- **Android**: Press phone's **Back button** (if available)
- **iPhone**: Swipe up from bottom edge (exit Safari fullscreen)
- **All devices**: Close browser tab and reopen

**Teaching swipe**:
- Practice swipe gesture together during setup
- Show them to swipe **from the very top edge** downward
- Needs to be at least 1 inch long

---

## Safety & Privacy

### What Data We Collect

Kids Mode collects **minimal data** to enforce watch time limits:

- **Profile ID**: Which child is watching
- **Video ID**: Which video they watched
- **Duration**: How long they watched
- **Timestamp**: When they watched

We **DO NOT** collect:
- Personal information from children
- Browsing history outside of Kids Mode
- Location data
- Device identifiers (beyond what's needed for session tracking)

### How We Protect Your Child

✅ **No ads**: Kids Mode has zero advertisements
✅ **No external links**: Videos play in fullscreen, no clickable links
✅ **No chat**: YouTube comments/live chat are disabled
✅ **No purchases**: No in-app purchases or payment screens
✅ **Parent-approved content**: Only videos you've added to your library
✅ **Secure authentication**: Uses same security as your main Medio account

### COPPA Compliance

Medio Kids Mode is designed to comply with COPPA (Children's Online Privacy Protection Act):

- We don't collect personal information from children under 13 without parental consent
- All data is tied to the **parent account** (not child directly)
- Parents can delete all watch history at any time

### Parent Controls

You (the parent) have full control:

- ✅ **Approve all videos** before kids can watch
- ✅ **Set watch time limits** per child
- ✅ **View watch history** anytime
- ✅ **Revoke access** by unregistering NFC chips
- ✅ **Export data** from Settings → Account → Export Data

---

## Tips for Success

### For Ages 4-5

- **Start with 3-5 videos** per chip (less overwhelming)
- **Practice gestures together** first few times
- **Use bright colors** on NFC stickers for easy identification
- **Set lower limits** (30 minutes) to encourage other activities

### For Ages 6-8

- **Let them help** assign videos to chips
- **Teach them** to check watch time remaining
- **Use as reward** for completing chores/homework
- **Encourage breaks** between videos (stretch, drink water)

### Best Practices

1. **Explain limits upfront**: "You can watch for 30 minutes, then it's time to play outside"
2. **Give 5-minute warning**: "5 more minutes, then time to stop"
3. **Praise good behavior**: "Great job exiting when time was up!"
4. **Rotate video selections**: Update chips weekly to keep content fresh
5. **Watch together sometimes**: Use as bonding time, not just solo activity

---

## Frequently Asked Questions

### Q: Can I use Kids Mode on a tablet?

**A:** Yes! Kids Mode works on tablets (iPad, Android tablets). Gesture controls work the same way.

**Note**: NFC chips may not work on all tablets (some don't have NFC antennas). Use manual chip ID entry as backup.

---

### Q: Can multiple kids use Kids Mode at the same time?

**A:** No, Kids Mode is **one device, one child at a time**. Each session is tied to one profile.

**Workaround**: If you have multiple devices, each child can use Kids Mode on their own device simultaneously.

---

### Q: What happens if my child exits the browser app?

**A:** The watch session **ends automatically** and watch time is saved. When they reopen Kids Mode, they'll need to scan the NFC chip again.

---

### Q: Can I use Kids Mode offline?

**A:** Not currently. Kids Mode requires internet connection to:
- Load videos from YouTube/Vimeo/Dailymotion
- Track watch time on our servers
- Enforce daily limits

**Future enhancement**: Offline playback is planned for a future update.

---

### Q: How do I delete a child's watch history?

**A:** Go to **Settings** → **Profiles** → **[Child's Name]** → **Delete Watch History**

**Note**: This won't affect their daily limit (that resets at midnight automatically).

---

### Q: Can I share NFC chips between siblings?

**A:** Yes! NFC chips aren't tied to profiles. Any child can scan any chip.

**However**: If two siblings watch different content, consider assigning separate chips so each child has their own video collections.

---

### Q: What if I lose an NFC chip?

**A:** No problem! NFC chips are just identifiers, no sensitive data stored on them.

**Steps**:
1. Go to **NFC Manager**
2. **Unregister** the lost chip (prevents someone else from using it)
3. **Register a new chip** and assign the same videos

---

### Q: Can I use Kids Mode on desktop/laptop?

**A:** Kids Mode works on desktop browsers, but **gesture controls require a smartphone/tablet** (desktops don't have accelerometers/gyroscopes).

**Recommendation**: Use Kids Mode on mobile devices for the full experience.

---

## Getting Help

### Support Resources

- **User Guide**: https://medio-react-app.fly.dev/help
- **Email Support**: support@medio.app (response within 24 hours)
- **GitHub Issues**: https://github.com/rayberirondelsol/medio/issues

### Providing Feedback

We'd love to hear your thoughts!

- **Feature requests**: Email support@medio.app with "[Feature Request]" in subject
- **Bug reports**: Include device model, browser version, and screenshots
- **Success stories**: Share on social media with #MedioKidsMode

---

## What's Next?

### Coming Soon

🔜 **Offline playback** - Download videos for car trips
🔜 **Customizable gestures** - Adjust sensitivity per child
🔜 **Voice commands** - "Next video", "Pause" for accessibility
🔜 **Haptic feedback** - Phone vibrates when gesture recognized
🔜 **QR codes** - Alternative to NFC chips for iOS users

---

**Thank you for using Medio Kids Mode!** 🎉

We hope this makes screen time safer, simpler, and more enjoyable for your family.

**Questions?** Email support@medio.app

---

**Last Updated**: 2025-10-25 | **Version**: 1.0.0 | **Spec**: 008-kids-mode-gestures
