import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Meteor } from 'meteor/meteor'
import { EventsSchema } from '/imports/both/collections/events'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Alert } from 'reactstrap'
import FormWizard from './FormWizard'
import i18n from '/imports/both/i18n/en'
import qs from 'query-string'
import './styles.scss'

const { NewEventModal: i18n_ } = i18n // Strings from i18n

class NewEventModal extends Component {
  constructor () {
    super()
    this.state = {
      currentStep: 0,
      editMode: false,
      form: null,
      googleLoaded: false,
      hasErrors: false
    }

    if (window.google) {
      this.state.googleLoaded = true
    }
  }

  static getDerivedStateFromProps (nextProps, prevState) {
    if (window.__editData) {
      return {
        ...nextProps,
        editMode: true
      }
    }
    return nextProps
  }

  componentDidMount () {
    // ensure google maps is loaded
    this.interval = setInterval(() => {
      if (window.google) {
        clearInterval(this.interval)
        this.setState({ googleLoaded: true })
      }
    }, 1000) // 1 second
  }

  componentWillUnmount () {
    clearInterval(this.interval)
    this.interval = null
  }

  render () {
    const {
      currentStep,
      editMode,
      googleLoaded,
      hasErrors,
      isOpen
    } = this.state

    const hasGoogleMapsLoaded = window.google || googleLoaded

    const header = i18n_.modal_header

    return hasGoogleMapsLoaded && (
      <Modal id='new-event-modal' isOpen={isOpen} toggle={this.toggleModal} size='lg'>
        <ModalHeader toggle={this.toggleModal}>
          {editMode ? header.replace('New', 'Edit') : header}
        </ModalHeader>

        <Alert color='danger' isOpen={hasErrors} toggle={this.toggleErrors} className='error-general'>
          Please check that you've filled all the necessary fields
        </Alert>

        <ModalBody>
          <FormWizard
            currentStep={currentStep}
            passFormRefToParent={this.getRef}
            editMode={editMode} />
        </ModalBody>

        <ModalFooter>
          {currentStep + 1 <= 1 &&
            <Button color='primary' onClick={this.moveNext}>Next</Button>
          }
          {currentStep === 1 &&
            <Button color='primary' onClick={this.submit} className='submit'>Submit</Button>
          }
          {currentStep > 0 &&
            <Button color='primary' onClick={this.moveBack}>Back</Button>
          }
        </ModalFooter>
      </Modal>
    )
  }

  moveNext = () => {
    this.setState(prevState => ({ currentStep: prevState.currentStep + 1 }))
  };

  moveBack = () => {
    this.setState(prevState => ({ currentStep: prevState.currentStep - 1, hasErrors: false }))
  };

  submit = () => {
    this.state.form.validate({ clean: true })
      .then(() => {
        window.NProgress.set(0.4)

        let model = EventsSchema.clean(this.state.form.getModel())
        if (this.state.editMode) {
          model._id = this.state.form.getModel()._id
          this.callEditEvent(model)
        } else {
          this.callNewEvent(model)
        }
      })
      .catch(err => {
        this.setState({ hasErrors: true })

        if (Meteor.isDevelopment) { console.log(err.details, err) }
      })
  }

  callNewEvent = model => {
    Meteor.call('Events.newEvent', model, (err, res) => {
      if (!err) {
        this.setState({ currentStep: 0 }) // return to first step
        window.__recentEvent = { ...model, _id: res }
        this.props.history.push('/thank-you')
      }

      window.NProgress.done()
      if (Meteor.isDevelopment) { console.log(err) }
    })
  }

  callEditEvent = (model) => {
    Meteor.call('Events.editEvent', model, (err, res) => {
      if (!err) {
        window.__updatedData = model // update event page.
        this.setState({ currentStep: 0 })
        this.props.history.push('/page/' + model._id)
      }

      window.NProgress.done()
      if (Meteor.isDevelopment) { console.log(err, model) }
    })
  }

  toggleModal = () => {
    const { pathname, search } = this.props.location
    const queryStrings = qs.parse(search)

    delete queryStrings.edit
    delete queryStrings.new

    const url = pathname + '?' + qs.stringify(queryStrings)
    this.props.history.push(url)
  }

  toggleErrors = () => this.setState({ hasErrors: false })

  getRef = (form) => {
    this.setState({ form: form })
  }
}

NewEventModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  location: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired
}

export default NewEventModal
