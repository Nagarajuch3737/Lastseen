// Time formatting tests
class TimeFormatter {
    static formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (diffSeconds < 10) return 'just now';
        if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
        if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
        if (diffMonths < 12) return `${diffMonths} months ago`;
        return `${diffYears} years ago`;
    }
}

// Test helper functions
function createTestDate(secondsAgo) {
    const date = new Date();
    date.setSeconds(date.getSeconds() - secondsAgo);
    return date;
}

function expectEqual(actual, expected) {
    if (actual !== expected) {
        throw new Error(`Expected "${expected}", but got "${actual}"`);
    }
}

// Test cases
function runTimeFormattingTests() {
    console.log('Running time formatting tests...');
    
    // Test just now
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(5)), 'just now');
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(9)), 'just now');
    
    // Test seconds
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(10)), '10 seconds ago');
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(30)), '30 seconds ago');
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(59)), '59 seconds ago');
    
    // Test minutes
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(60)), '1 minutes ago');
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(120)), '2 minutes ago');
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(3599)), '59 minutes ago');
    
    // Test hours
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(3600)), '1 hours ago');
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(7200)), '2 hours ago');
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(86399)), '23 hours ago');
    
    // Test days
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(86400)), 'yesterday');
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(172800)), '2 days ago');
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(518399)), '5 days ago');
    
    // Test weeks
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(604800)), '1 weeks ago');
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(1209600)), '2 weeks ago');
    
    // Test months
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(2592000)), '1 months ago');
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(5184000)), '2 months ago');
    
    // Test years
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(31536000)), '1 years ago');
    expectEqual(TimeFormatter.formatTimeAgo(createTestDate(63072000)), '2 years ago');
    
    console.log('✅ All time formatting tests passed!');
}

// Long press detection tests
class LongPressDetector {
    constructor(threshold = 600) {
        this.threshold = threshold;
        this.timer = null;
        this.isLongPress = false;
    }
    
    start() {
        this.isLongPress = false;
        this.timer = setTimeout(() => {
            this.isLongPress = true;
        }, this.threshold);
    }
    
    end() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        return this.isLongPress;
    }
    
    cancel() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.isLongPress = false;
    }
}

function runLongPressTests() {
    console.log('Running long press detection tests...');
    
    // Test short press (should not trigger long press)
    const detector1 = new LongPressDetector(100); // 100ms for testing
    detector1.start();
    setTimeout(() => {
        const result = detector1.end();
        if (result !== false) {
            throw new Error('Short press should not trigger long press');
        }
    }, 50);
    
    // Test long press (should trigger long press)
    const detector2 = new LongPressDetector(100); // 100ms for testing
    detector2.start();
    setTimeout(() => {
        const result = detector2.end();
        if (result !== true) {
            throw new Error('Long press should trigger long press');
        }
    }, 150);
    
    // Test cancel
    const detector3 = new LongPressDetector(100);
    detector3.start();
    detector3.cancel();
    const result3 = detector3.end();
    if (result3 !== false) {
        throw new Error('Cancelled press should not trigger long press');
    }
    
    setTimeout(() => {
        console.log('✅ All long press detection tests passed!');
    }, 200);
}

// UUID generation test
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function runUUIDTests() {
    console.log('Running UUID generation tests...');
    
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    
    // Test format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid1)) {
        throw new Error('UUID format is incorrect');
    }
    
    // Test uniqueness
    if (uuid1 === uuid2) {
        throw new Error('UUIDs should be unique');
    }
    
    console.log('✅ All UUID generation tests passed!');
}

// Run all tests
function runAllTests() {
    try {
        runTimeFormattingTests();
        runLongPressTests();
        runUUIDTests();
        console.log('🎉 All tests passed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Export for use in other files or run directly
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TimeFormatter,
        LongPressDetector,
        generateUUID,
        runAllTests
    };
} else {
    // Run tests if this file is executed directly
    runAllTests();
}
