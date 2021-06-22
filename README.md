# Invoice Keeper and Analytics

This is a NestJS Microservice implementation of the [Invoice keeper and Analytics application](https://github.com/LesibaneB/invoice-keeper-and-analytics-backend).

## Description

The project will be used as a playground for how to implement a Microservice architecture using NestJS and how to set that up to run using [Kubernetes](https://kubernetes.io/) and its technologies.

### Features

- Account Creation and Email Verification
- Authentication
- Extraction of invoice text data
- Storing of processed invoice data and invoice images
- Email Sending
- Unit and E2E tests

### Future Features

- Fixing the E2E tests so they work in a microservice envinroment
- Run each microservice inside their separate Kubernetes pods
- Add and configure a MongoDB pod for the applications DB
- Add and configure a [RabbitMQ](https://www.rabbitmq.com/) pod for message based inter-service communication
- Use [Helm](https://helm.sh/) for templating to reduce the number of yaml config files for each service

### Built With

- [NestJS](https://docs.nestjs.com/)
- [MongoDB](https://docs.mongodb.com/guides/)
- [Mongoose](https://mongoosejs.com/docs/)
- [Typescript](https://www.typescriptlang.org/)
- [Mustache](https://github.com/janl/mustache.js)
- [PassportJS](http://www.passportjs.org/docs/)
- [BCrypt](https://www.npmjs.com/package/bcrypt)
- [GCloud AutoML](https://cloud.google.com/natural-language/automl/docs)
- [GCloud Storage](https://cloud.google.com/storage)

## Authors

Bonakele Lesibane
