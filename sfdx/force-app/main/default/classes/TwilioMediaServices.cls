public with sharing class TwilioMediaServices {

    private static final Integer HTTP_STATUS_MULTIPLE_CHOICES = 300;
    private static final Integer HTTP_STATUS_SWITCH_PROXY = 306;

    @TestVisible
    private static final Integer HTTP_STATUS_TEMPORARY_REDIRECT = 307;

    private static final Integer HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

    @TestVisible
    private static final String HTTP_HEADER_LOCATION = 'Location';
    
    private static final String HTTP_METHOD_GET = 'GET';

    /**
     * This method will filter out Twilio Media where 
     * the URL is blank If it's not Blank then it will
     * queue up @future method to fetch data from
     * Twilio.
     */
    public static void getMedia(final List<Twilio_Media__c> tms) {
        for(Twilio_Media__c aTM: tms) {
            if(String.isNotBlank(aTM.URL__c)) {
                getMedia(aTM.Id);
            }
        }
    }

    /**
     * This method will fetch the Media from Twilio and 
     * save it as an attachment.
     */
    @future(callout=true)
    private static void getMedia(final Id tmId) {
        final Twilio_Media__c aTM = [
            SELECT Id, URL__c, Content_Type__c
            FROM Twilio_Media__c 
            WHERE Id =: tmId
        ];
        
        final String url = aTM.URL__c;
        final String contentType = aTM.Content_Type__c;

        Boolean redirect = false;
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        HttpResponse res = new HttpResponse();

        req.setMethod('GET');
        req.setEndpoint(url);
        res = http.send(req);

        if(res.getStatusCode() >= HTTP_STATUS_MULTIPLE_CHOICES && 
            res.getStatusCode() <= HTTP_STATUS_TEMPORARY_REDIRECT && 
            res.getStatusCode() != HTTP_STATUS_SWITCH_PROXY) {
            do {
                redirect = false; // reset the value each time
                String redirectURL = res.getHeader(HTTP_HEADER_LOCATION); // get location of the redirect
                if(redirectURL == null) {
                    redirect = false;
                    continue;
                }

                req = new HttpRequest();
                req.setEndpoint(redirectURL);
                req.setMethod(HTTP_METHOD_GET);
                res = http.send(req);

                if(res.getStatusCode() != HTTP_STATUS_INTERNAL_SERVER_ERROR || Test.isRunningTest()) {
                    if(res.getStatusCode() >= HTTP_STATUS_MULTIPLE_CHOICES && 
                        res.getStatusCode() <= HTTP_STATUS_TEMPORARY_REDIRECT && 
                        res.getStatusCode() != HTTP_STATUS_SWITCH_PROXY) {
                        redirect = true;
                    }
                }
            } while (redirect && Limits.getCallouts() != Limits.getLimitCallouts());
        }

        if(res.getBodyAsBlob() != null) {
            TimeZone tz = UserInfo.getTimeZone();
            Attachment att = new Attachment(
                Name = DateTime.now().format(), 
                Body = res.getBodyAsBlob(), 
                ContentType = contentType, 
                ParentId = tmId
            );
            insert att;
        }
    }
}