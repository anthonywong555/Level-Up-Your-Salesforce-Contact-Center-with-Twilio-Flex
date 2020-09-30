import { LightningElement, track } from "lwc";
import {
  subscribe,
  unsubscribe,
  onError,
  setDebugFlag,
  isEmpEnabled
} from "lightning/empApi";

export default class TranscriptContainer extends LightningElement {
  @track channelName = "/event/Twilio_Voice_Transcription__e";
  @track isSubscribeDisabled = false;
  @track isUnsubscribeDisabled = !this.isSubscribeDisabled;
  @track lines = [];
  @track currentLine = {
    Speaker__c: "Customer",
    direction: "inbound"
  };
  @track currentAgentLine = {
    Speaker__c: "Agent",
    direction: "outbound"
  };

  subscription = {};

  // Tracks changes to channelName text field
  handleChannelName(event) {
    this.channelName = event.target.value;
  }

  // Handles subscribe button click
  handleSubscribe() {
    // Callback invoked whenever a new event message is received
    const messageCallback = response => {
      console.log("New message received : ", JSON.stringify(response));
      let transcript = response.data.payload;

      if (transcript.Speaker__c === "Agent") {
        transcript.direction = "outbound";
        transcript.id = transcript.direction + transcript.SequenceNum__c;
        transcript.liClass =
          "slds-chat-listitem slds-chat-listitem_" + transcript.direction;
        transcript.textClass =
          "slds-chat-message__text slds-chat-message__text_" +
          transcript.direction;
        console.log(JSON.stringify(transcript));
        if (transcript.isComplete__c) {
          this.lines.push(transcript);
          this.currentAgentLine = {
            ...transcript,
            text__c: ""
          };
        } else {
          this.currentAgentLine = transcript;
        }
      } else {
        transcript.direction = "inbound";
        transcript.id = transcript.direction + transcript.SequenceNum__c;
        transcript.liClass =
          "slds-chat-listitem slds-chat-listitem_" + transcript.direction;
        transcript.textClass =
          "slds-chat-message__text slds-chat-message__text_" +
          transcript.direction;
        console.log(JSON.stringify(transcript));
        if (transcript.isComplete__c) {
          this.lines.push(transcript);
          this.currentLine = {
            ...transcript,
            text__c: ""
          };
        } else {
          this.currentLine = transcript;
        }
      }

      // Response contains the payload of the new message received
    };

    // Invoke subscribe method of empApi. Pass reference to messageCallback
    subscribe(this.channelName, -1, messageCallback).then(response => {
      // Response contains the subscription information on successful subscribe call
      console.log(
        "Successfully subscribed to : ",
        JSON.stringify(response.channel)
      );
      this.subscription = response;
      this.toggleSubscribeButton(true);
    });
  }

  // Handles unsubscribe button click
  handleUnsubscribe() {
    this.toggleSubscribeButton(false);

    // Invoke unsubscribe method of empApi
    unsubscribe(this.subscription, response => {
      console.log("unsubscribe() response: ", JSON.stringify(response));
      // Response is true for successful unsubscribe
    });
  }

  toggleSubscribeButton(enableSubscribe) {
    this.isSubscribeDisabled = enableSubscribe;
    this.isUnsubscribeDisabled = !enableSubscribe;
  }

  handlePrintValues() {
    console.log(this.confidence);
    console.log(this.currentLine);
    console.log(JSON.stringify(this.lines));
  }

  registerErrorListener() {
    // Invoke onError empApi method
    onError(error => {
      console.log("Received error from server: ", JSON.stringify(error));
      // Error contains the server-side error
    });
  }
}