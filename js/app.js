angular.module('app', [])
  .service('ds', function() {
          /************************************
          * Connect and login to deepstreamHub
          ************************************/
          //establish a connection. You can find your endpoint url in the
          //deepstreamhub dashbo
         return deepstream('wss://154.deepstreamhub.com?apiKey=97a397bd-ccd2-498f-a520-aacc9f67373c').login()
  })
  .service('scopeApply', function(){
    return function(scope) {
      if( !scope.$$phase ) {
        scope.$apply();
      }
    }
  })
  .service( 'bindFields', function(scopeApply){
    /**
     * Bind fields to 
     * scope and keep scope synced
     * with realtime changes
     */
    return function getField( scope, record, names ) {
      angular.forEach( names, function( name ){
        Object.defineProperty( scope, name, {
          get: function() {
            return record.get( name );
          },
          set: function( newValue ) {
            if( newValue === undefined ) {
              return;
            }
            record.set( name, newValue );
          }
        });
      });

      record.subscribe(function() {
        scopeApply(scope)
      });
    }
  })
  /************************************
	* Connection status
	**********************************/
  .component('connection', {
    template: `
       <div class="group connectionState">
          Connection-State is: <em id="connection-state">{{connectionState}}</em>
       </div>
    `,
    controller: function connectionController($scope, ds, scopeApply) {
      $scope.connectionState = 'INITIAL';
      ds.on( 'connectionStateChanged', function(connectionState){
        // $scope.$apply(function(){
          $scope.connectionState = connectionState;
        // })
        scopeApply($scope)
      });
    }
  })
  /************************************
	* Realtime datastore (Records)
	**********************************/
  .component('record', {
    template: `
      <div class="group realtimedb">
          <h2>Realtime Datastore</h2>
          <div class="input-group half left">
              <label>Firstname</label>
              <input type="text" ng-model="firstname" id="firstname"/>
          </div>
          <div class="input-group half">
              <label>Lastname</label>
              <input type="text" ng-model="lastname" id="lastname"/>
          </div>
      </div>
    `,
    controller: function RecordController($scope, ds, bindFields) {
      var fields = ['firstname', 'lastname'];
      this.record = ds.record.getRecord('test/johndoe');
      bindFields($scope, this.record, fields);
    }
  })
  /************************************
	*  Publish Subscribe (Events)
	**********************************/
  .component('events', {
    template: `
      <div class="group pubsub">
          <div class="half left">
              <h2>Publish</h2>
              <button class="half left" ng-click="handleClick()" >Send test-event with</button>
              <input type="text" ng-model="value" className="half"/>
          </div>
          <div class="half">
              <h2>Subscribe</h2>
              <ul>
                  <li ng-repeat="event in eventsReceived" >Received event data: <em>{{event}}</em></li>
              </ul>
          </div>
      </div>
    `,
    controller: function EventsController($scope, ds, scopeApply) {
      $scope.value = ''
      $scope.eventsReceived = [];
      // Whenever the user clicks the button
      $scope.handleClick = function(){
        // Publish an event called `test-event` and send
        ds.event.emit('event-data', $scope.value);
      };
      ds.event.subscribe('event-data', function(val) {
        // Whenever we receive a message for this event,
        // append a list item to our 
        $scope.eventsReceived.push(val)
        scopeApply($scope)
      });
    }
  })
  /************************************
	* Request Response (RPC)
	********************************/
  .component('rpc', {
    template: `
      <div class="group reqres">
          <div class="half left">
              <h2>Request</h2>
              <button class="half left" id="make-rpc" ng-click="handleClick()">Make multiply request</button>
              <div class="half">
                  <input type="text" id="request-value" className="half left" ng-model="requestValue"/>
                  <span class="response half item" id="display-response">
                      {{displayResponse}}
                  </span>
              </div>
          </div>
          <div class="half">
              <h2>Response</h2>
              <div class="half left item">Multiply number with:</div>
              <input type="text" class="half" id="response-value" ng-model="responseValue" />
          </div>
      </div>
    `,
    controller: function RPCController($scope, ds, scopeApply) {
      $scope.requestValue = '3';
      $scope.responseValue = '7';
      $scope.displayResponse = '-';

      $scope.handleClick = function() {
        	var data = {
            value: parseFloat( $scope.requestValue )
          };

          // Make a request for `multiply-number` with our data object
          // and wait for the response
          ds.rpc.make( 'multiply-number', data, function( err, resp ){

            //display the response (or an error)
            $scope.displayResponse = resp || err.toString();
            scopeApply($scope)
          });

          	// Register as a provider for multiply-number
          ds.rpc.provide( 'multiply-number', function( data, response ){
            // respond to the request by multiplying the incoming number
            // with the one from the response input
            response.send( data.value * parseFloat( $scope.responseValue ) );
          });
      }
    }
  });