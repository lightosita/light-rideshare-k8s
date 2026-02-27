// Put this identical file in EACH service's utils/logger.ts
export class MessageLogger {
  static logMessage(service: string, action: 'SENDING' | 'RECEIVED', channel: string, message: any) {
    const timestamp = new Date().toISOString();
    const arrow = action === 'SENDING' ? '🟢 ➡️' : '🔵 ⬅️';
    
    console.log(`\n${arrow} [${timestamp}] ${service} ${action} on ${channel}`);
    console.log('📦 Message:', {
      event: message.event,
      data: message.data,
      timestamp: message.timestamp
    });
    console.log('─'.repeat(80));
  }
}