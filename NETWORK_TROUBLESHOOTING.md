# Network Configuration for PatternPals

If you're having network issues with Expo (seeing 172.x.x.x addresses instead of your local 192.168.1.x network), here are several solutions:

## Option 1: Use Tunnel Mode (Recommended)
```bash
npx expo start --tunnel
```
This creates a secure tunnel that bypasses network configuration issues.

## Option 2: Use LAN Mode
```bash
npx expo start --host lan
```
This forces Expo to use your local area network.

## Option 3: Use Localhost (for emulators)
```bash
npx expo start --host localhost
```
This works well if you're using Android/iOS emulators on the same machine.

## Option 4: Manual Network Configuration
If you're in a Docker container or WSL environment:

1. Find your host machine's IP:
   ```bash
   # On Windows in Command Prompt/PowerShell:
   ipconfig
   
   # On macOS/Linux:
   ifconfig
   ip addr show
   ```

2. Start Expo with tunnel mode:
   ```bash
   npx expo start --tunnel
   ```

## Common Network Issues:

1. **Docker/WSL**: The 172.x.x.x address indicates you're in a containerized environment. Use `--tunnel` mode.

2. **Corporate Networks**: Some corporate firewalls block Expo. Use `--tunnel` mode.

3. **VPN**: If you're on a VPN, try disconnecting or use `--tunnel` mode.

4. **Multiple Network Interfaces**: Your machine might have multiple network interfaces. Use `--host lan` to let Expo choose the best one.

## Testing Your Connection:

After starting Expo with the correct network configuration, you should see:
- A QR code that works when scanned with Expo Go
- The correct IP address (192.168.1.x in your case)
- No more 172.x.x.x addresses

Try tunnel mode first - it's the most reliable solution for network issues!
