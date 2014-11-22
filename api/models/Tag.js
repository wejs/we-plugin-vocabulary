
module.exports = {
  schema: true,
  attributes: {
    // term creator
    creator: {
      model: 'User',
      required: true
    },
    text: {
      type: 'string',
      required: true,
      unique: true
    },
    description: {
      type: 'text'
    }
  }
}