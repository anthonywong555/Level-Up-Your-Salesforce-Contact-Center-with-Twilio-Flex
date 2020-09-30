@isTest
public with sharing class TwilioMediaServicesTest {

    public static final Integer NUM_TWILIO_MEDIA = 2;
    public static final String API_TWILIO_URL = 'https://api.twilio.com/';
    public static final String MEDIA_TWILIO_URL = 'https://media.twiliocdn.com/';
    public static final String AWS_S3_URL = 'https://s3-external-1.amazonaws.com/';
    public static final Blob RESPONSE_BLOB = Blob.valueOf('Test');
    public static final String RESPONSE_CONTENT_TYPE = 'image/jpeg';

    /**
     * This method is responsible for creating HTTP Mocks
     */
    static void setupMocks(){
        List<Twilio_Media__c> tms = new List<Twilio_Media__c>();

        SingleRequestMock apiTwilioResponds = new SingleRequestMock(
            TwilioMediaServices.HTTP_STATUS_TEMPORARY_REDIRECT,
            'TEMPORARY REDIRECT',
            '',
            new Map<String, String>{
                TwilioMediaServices.HTTP_HEADER_LOCATION => MEDIA_TWILIO_URL
            }
        );
 
        SingleRequestMock mediaTwilioResponds = new SingleRequestMock(
            301,
            'Moved Permanently',
            '',
            new Map<String,String>{
                TwilioMediaServices.HTTP_HEADER_LOCATION => AWS_S3_URL
            }
        );

        SingleRequestMock awsS3Responds = new SingleRequestMock(
            200,
            'OK',
            RESPONSE_BLOB,
            null
        );
 
        Map<String, HttpCalloutMock> endpointToResponds = new Map<String,HttpCalloutMock>();
        endpointToResponds.put(API_TWILIO_URL, apiTwilioResponds);
        endpointToResponds.put(MEDIA_TWILIO_URL, mediaTwilioResponds);
        endpointToResponds.put(AWS_S3_URL, awsS3Responds);

        HttpCalloutMock multiCalloutMock = new MultiRequestMock(endpointToResponds);
        Test.setMock(HttpCalloutMock.class, multiCalloutMock);
    }

    /**
     *  In this test we will create a set of number of 
     *  Twilio Media Objects with NO URLs.
     *  We expect that there will be no Attachments records to
     *  be created.
     */
    static testMethod void getMediaNoURL() {
        List<Twilio_Media__c> tms = new List<Twilio_Media__c>();

        for(Integer i = 0; i < NUM_TWILIO_MEDIA; i++) {
            Twilio_Media__c aTM = new Twilio_Media__c(
                SID__c = String.valueOf(i)
            );
            tms.add(aTM);
        }

        Test.startTest();
            insert tms;
        Test.stopTest();

        List<Attachment> attachments = [SELECT Id FROM Attachment];

        System.assertEquals(
            0, 
            attachments.size(), 
            'We expect that no attachment were created due to URL__c was blank.'
        );
    }

    /**
     * This method only test for creating one Twilio Media record.
     */
    static testMethod void getMediaWithOneRecord() {
        setupMocks();

        final Twilio_Media__c aTM = new Twilio_Media__c(
            SID__c = 'MM',
            URL__c = API_TWILIO_URL,
            Content_Type__c = RESPONSE_CONTENT_TYPE
        );

        Test.startTest();
            insert aTM;
        Test.stopTest();

        final List<Attachment> attachments = [
            SELECT Id, Name, Body, ContentType, ParentId 
            FROM Attachment
        ];

        System.assertEquals(
            1,
            attachments.size(), 
            'We expect that only one attachment has been were created.'
        );

        Attachment anAttachment = attachments[0];

        System.assertEquals(
            aTM.Id, 
            anAttachment.ParentId, 
            'We expect the new attachment looks up to the newly created Twilio Media.'
        );

        System.assertEquals(
            RESPONSE_BLOB, 
            anAttachment.Body, 
            'We expect the new attachment\'s body equals to the mock\'s body.'
        );

        System.assertEquals(
            RESPONSE_CONTENT_TYPE, 
            anAttachment.ContentType, 
            'We expect the new attachment\'s content type equals to the mock\'s content type.'
        );

        System.assert(
            Datetime.parse(anAttachment.Name) != null , 
            'We expect the name of the attachment is able to be Datetime.parseable.'
        );
    }

    /**
     * This method only test for creating multiple Twilio Media records.
     */
    static testMethod void getMediaWith1to1() {
        setupMocks();

        List<Twilio_Media__c> tms = new List<Twilio_Media__c>();

        for(Integer i = 0; i < NUM_TWILIO_MEDIA; i++) {
            Twilio_Media__c aTM = new Twilio_Media__c(
                SID__c = 'MM' + i,
                URL__c = API_TWILIO_URL,
                Content_Type__c = RESPONSE_CONTENT_TYPE
            );
            tms.add(aTM);
        }

        Test.startTest();
            insert tms;
        Test.stopTest();

        final Map<Id, Twilio_Media__c> idToTM = new Map<Id, Twilio_Media__c>(tms);

        final List<Attachment> attachments = [
            SELECT Id, Name, Body, ContentType, ParentId 
            FROM Attachment
        ];

        System.assertEquals(
            NUM_TWILIO_MEDIA,
            attachments.size(), 
            'We expect that only ' + NUM_TWILIO_MEDIA + ' attachment has been were created.'
        );

        for(Attachment anAttachment : attachments) {
            System.assert(
                idToTM.get(anAttachment.ParentId) != null, 
                'We expect the new attachment looks up to the newly created Twilio Media.'
            );

            System.assertEquals(
                RESPONSE_BLOB, 
                anAttachment.Body, 
                'We expect the new attachment\'s body equals to the mock\'s body.'
            );

            System.assertEquals(
                RESPONSE_CONTENT_TYPE, 
                anAttachment.ContentType, 
                'We expect the new attachment\'s content type equals to the mock\'s content type.'
            );

            System.assert(
                Datetime.parse(anAttachment.Name) != null , 
                'We expect the name of the attachment is able to be Datetime.parseable.'
            );

            idToTM.remove(anAttachment.ParentId);
        }

        System.assertEquals(
            0, 
            idToTM.size(),
            'We expect one attachment maps to one Twilio Media Object'
        );
    }
}