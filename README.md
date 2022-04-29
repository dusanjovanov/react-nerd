![React nerd logo](https://raw.githubusercontent.com/dusanjovanov/react-nerd/master/logo.png 'React nerd logo')

Performant, minimal React form library

- Controlled fields like Formik, but fast (every field has it's own context)
- Excellent Typescript support

<br />

**[EXAMPLE AND DEMO](https://codesandbox.io/s/react-nerd-example-qq02w0)**

**[STRESS TEST WITH 500 FIELDS](https://codesandbox.io/s/react-nerd-stress-test-4smwzv)**

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

// wrap Form with FormProvider so it can call useFormActions

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

You should return either a boolean or some object whose leaf nodes are boolean from the `validate` function.

When this library calculates `isValid` it checks whether any of the leaf nodes in the validation state are `false`, and if so, the form is not valid.

So, in general, you shouldn't return error message strings from the `validate` function like you would do in Formik,
but rather calculate the error message from the validation result in the render of the component like in the example below.

You can use the nifty library [fun-validation](https://github.com/dusanjovanov/fun-validation)

```tsx
import { isStringLongerThan } from 'fun-validation';

const FirstName = () => {
  const { value, setValue, validation } = useField({
    name: 'firstName',
    // whatever you return from the validate function, you will get back from useField
    validate: value => isStringLongerThan(0)(value),
  });

  const error = validation === false ? 'Required' : undefined;

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

```tsx
useField: ({name: string, validate: (value: any) => any}) => {value, validation, setValue, setBlur}
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

### List of all imperative actions

```tsx
setFieldValue: ({name: string, value?: any, shouldValidate?: boolean}) => void

setFieldValidation: ({name: string, validation: any}) => void

setBlur: ({ name: string }) => void;

validateField: ({name: string}) => Promise<FieldValidation>

validateAllFields: () => Promise<Validation>

submitForm: () => Promise<any>

resetForm: (newState?: Partial<NewState>) => void

type NewState<Values> = {
  values: Partial<Values>;
  validation: Partial<Validation>;
  isSubmitting: boolean;
  submitCount: number;
};

handleSubmit: (e?: any) => void

handleReset: (e?: any) => void

setValues: ({values: Partial<Values>, shouldValidate?: boolean}) => void

setValidation: ({validation: Partial<Validation>}) => void
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

```tsx
useFieldState: ({ name: string }) => FieldState;

type FieldState = {
  value: any;
  validation: any;
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

### List of hooks for accessing form state

```tsx
useValues: () => Values;

useValidation: () => Validation;

useIsDirty: () => boolean;

useIsValid: () => boolean;

useIsSubmitting: () => boolean;

useSubmitCount: () => number;
```

# Nested fields

This is how you would implement an array of text fields

```tsx
import { createForm, append, remove } from 'react-nerd';

const { useField } = createForm({
  initialValues: {
    users: ['Frank', 'James'],
  },
});

// the field array component
const Users = () => {
  const { value: users, setValue } = useField({ name: 'users' });

  const addUser = () => {
    setValue(append(users, 'New user'));
  };

  return (
    <div>
      <ul>
        {users.map((user, index) => (
          <UserItem key={index} user={user} index={index} />
        ))}
      </ul>
      <button onClick={addUser}>Add user</button>
    </div>
  );
};

// you should always memoize an item component in a dynamic list
const UserItem = React.memo(({ user, index }) => {
  const { setFieldValue } = useFormActions();

  // notice how the UserItem component nowhere depends on the
  // value of the whole array, and that's why the memoization will work
  const updateUser = (user: string) => {
    setFieldValue({
      name: "users",
      setValue: (users) => replace(users, index, user)
    })
  }

  const removeUser = () => {
    setFieldValue({
      name: 'users',
      setValue: users => remove(users, index),
    });
  };

  return (
    <li>
      <input type="text" value={user} onChange={e => updateUser(e.target.value)}>
      <button onClick={removeUser}>Remove user</button>
    </li>
  );
});
```

### List of exported helpers for field arrays

```tsx
prepend: <E>(array: E[], newElement: E) => E[]

append: <E>(array: E[], newElement: any) => any[]

remove: <E>(array: E[], index: number) => E[]

replace: <E>(array: E[], index: number, newElement: E) => E[]

insert: <E>(array: E[], index: number, newElement: E) => E[]

swap: <E>(array: E[], indexA: number, indexB: number) => E[]

move: <E>(array: E[], from: number, to: number) => E[]
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
