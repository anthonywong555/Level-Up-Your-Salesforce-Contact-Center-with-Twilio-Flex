trigger TwilioMedia on Twilio_Media__c (after insert) {
    if(Trigger.isAfter) {
        if(Trigger.isInsert) {
            TwilioMediaServices.getMedia(Trigger.new);
        }
    }
}