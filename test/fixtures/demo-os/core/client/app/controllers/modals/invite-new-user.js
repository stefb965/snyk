import Ember from 'ember';

export default Ember.Controller.extend({
    notifications: Ember.inject.service(),

    role: null,
    authorRole: null,

    roles: Ember.computed(function () {
        return this.store.find('role', {permissions: 'assign'});
    }),

    // Used to set the initial value for the dropdown
    authorRoleObserver: Ember.observer('roles.@each.role', function () {
        var self = this;

        this.get('roles').then(function (roles) {
            var authorRole = roles.findBy('name', 'Author');

            self.set('authorRole', authorRole);

            if (!self.get('role')) {
                self.set('role', authorRole);
            }
        });
    }),

    confirm: {
        accept: {
            text: 'send invitation now'
        },
        reject: {
            buttonClass: 'hidden'
        }
    },

    actions: {
        setRole: function (role) {
            this.set('role', role);
        },

        confirmAccept: function () {
            var email = this.get('email'),
                role = this.get('role'),
                self = this,
                newUser;

            // reset the form and close the modal
            self.set('email', '');
            self.set('role', self.get('authorRole'));
            self.send('closeModal');

            this.store.find('user').then(function (result) {
                var invitedUser = result.findBy('email', email);

                if (invitedUser) {
                    if (invitedUser.get('status') === 'invited' || invitedUser.get('status') === 'invited-pending') {
                        self.get('notifications').showWarn('A user with that email address was already invited.');
                    } else {
                        self.get('notifications').showWarn('A user with that email address already exists.');
                    }
                } else {
                    newUser = self.store.createRecord('user', {
                        email: email,
                        status: 'invited',
                        role: role
                    });

                    newUser.save().then(function () {
                        var notificationText = 'Invitation sent! (' + email + ')';

                        // If sending the invitation email fails, the API will still return a status of 201
                        // but the user's status in the response object will be 'invited-pending'.
                        if (newUser.get('status') === 'invited-pending') {
                            self.get('notifications').showWarn('Invitation email was not sent.  Please try resending.');
                        } else {
                            self.get('notifications').showSuccess(notificationText);
                        }
                    }).catch(function (errors) {
                        newUser.deleteRecord();
                        self.get('notifications').showErrors(errors);
                    });
                }
            });
        },

        confirmReject: function () {
            return false;
        }
    }
});
