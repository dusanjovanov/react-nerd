# ReactNerd

# 🤓

Performant, minimal React form library

- Controlled fields like Formik, but fast (every field has it's own context)
- Excellent Typescript support

<br />

**[EXAMPLE AND DEMO](https://codesandbox.io/s/react-nerd-example-qq02w0)**

**[STRESS TEST WITH 500 FIELDS](https://codesandbox.io/s/react-nerd-example-qq02w0)**

<br />

[![npm](https://img.shields.io/npm/v/react-nerd?color=%231E90FF&label=npm&style=for-the-badge)](https://www.npmjs.com/package/react-nerd)

# Installation

```bash
npm install react-nerd
```

```bash
yarn add react-nerd
```

# Usage

```tsx
import { createForm } from 'react-nerd';

// create the form

const { FormProvider, useField, useFormActions } = createForm({
  initialValues: {
    firstName: '',
    lastName: '',
  },
});

// create field components

const FirstName = () => {
  const { value, setValue } = useField({ name: 'firstName' });

  return (
    <input type="text" value={value} onChange={e => setValue(e.target.value)} />
  );
};

const LastName = () => {
  const { value, setValue } = useField({ name: 'lastName' });

  return (
    <input type="text" value={value} onChange={e => setValue(e.target.value)} />
  );
};

// create form component

const Form = () => {
  const { handleSubmit } = useFormActions();

  return (
    <form onSubmit={handleSubmit}>
      <FirstName />
      <LastName />
    </form>
  );
};

// wrap form with FormProvider

const FormPage = () => {
  const onSubmit = values => {
    console.log(values);
  };

  return (
    <FormProvider onSubmit={onSubmit}>
      <Form />
    </FormProvider>
  );
};

// And that's it ! 🥳
```

# Validation

This library doesn't support validation schemas out of the box, and it only has field level validation via the `validate` function. We believe that is enough.

You can use the nifty library [fun-validation](https://github.com/dusanjovanov/fun-validation)

```tsx
import { isStringLongerThan } from 'fun-validation';

const FirstName = () => {
  const { value, setValue, validation } = useField({
    name: 'firstName',
    validate: value => isStringLongerThan(0)(value),
  });

  const error = validation === false ? undefined : 'Required';

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
};
```

# Imperative actions

Just use the `useFormActions` hook and get the functions. This hook never causes a render, because the functions are memoized.

```tsx
const ResetButton = () => {
  const { resetForm } = useFormActions();

  return <button onClick={resetForm}>Reset</button>;
};

const TriggerValidationButton = () => {
  const { validateField } = useFormActions();

  return (
    <button onClick={() => validateField({ name: 'firstName' })}>
      Trigger validation
    </button>
  );
};
```

# Accessing field state

If you need the state of another field (value, validation), use the `useFieldState` hook returned from `createForm`

```tsx
const FirstName = () => {
  const { value, setValue } = useField({ name: 'firstName' });
  const { value: lastNameValue } = useFieldState('lastName');

  useEffect(() => {
    // do something with last name value
  }, [lastNameValue]);

  return (
    <input type="text" value={value} onChange={e => setValue(e.target.value)} />
  );
};
```

# Accessing form state

There is a separate hook for reading each form state returned by `createForm`. This is done so you can choose which form state you want to subscribe to.

```tsx
const {
  useValues,
  useValidation,
  useIsDirty,
  useIsValid,
  useIsSubmitting,
  useSubmitCount,
} = createForm({
  initialValues: {
    firstName: '',
    lastName: '',
  },
});

const FormState = () => {
  const values = useValues();
  const validation = useValidation();
  const isDirty = useIsDirty();
  const isValid = useIsValid();
  const isSubmitting = useIsSubmitting();
  const submitCount = useSubmitCount();

  // do something with form state

  return <div>{/*
      or render something from form state
    */}</div>;
};
```

# Usage with Typescript

```tsx
// All you have to do is when creating the form, define the type of initial values

type MyFormState = {
  firstName: string;
  lastName: string;
};

const { FormProvider, useField, useFormActions } = createForm({
  initialValues: {
    firstName: '',
    lastName: '',
  } as MyFormState,
});

// And that's it, you have intellisense for everything: field keys, types of field values, type of validation result...etc
```
