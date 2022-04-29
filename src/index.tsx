import deepEqual from 'fast-deep-equal';
import * as React from 'react';

type Unwrap<T> = T extends Promise<infer U> ? U : T;

type FieldValidation = any;

type FieldState<Values> = {
  [FieldName in keyof Values]: {
    value: Values[FieldName];
    validation: FieldValidation;
  };
};

type State<Values> = FieldState<Values> & {
  isSubmitting: boolean;
  submitCount: number;
};

type FieldValidateFn<Value, ValidateFnReturnType> = (
  value: Value
) => ValidateFnReturnType;

type Validation<Values> = {
  [FieldName in keyof Values]: FieldValidation;
};

type OnSubmit<Values> = (values: Values) => void | Promise<any>;

type FormProviderProps<Values> = {
  children: React.ReactNode;
  onSubmit: OnSubmit<Values>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnMount?: boolean;
  calculateIsValid?: (validation: Validation<Values>) => boolean;
};

export type FieldProps<
  FieldName extends keyof Values,
  Values,
  ValidateFnReturnType
> = {
  name: FieldName;
  beforeValidate?: (value: Values[FieldName]) => void;
  validate?: FieldValidateFn<Values[FieldName], ValidateFnReturnType>;
  afterValidate?: (value: Values[FieldName]) => void;
};

type RegisterFn<FieldName> = (name: FieldName, reg: any) => void;

type FormActions<Values> = {
  setFieldValue: <FieldName extends keyof Values>(args: {
    name: FieldName;
    setValue: (value: State<Values>[FieldName]['value']) => Values[FieldName];
    shouldValidate?: boolean;
  }) => void;
  setFieldValidation: <FieldName extends keyof Values>(args: {
    name: FieldName;
    validation: FieldValidation;
  }) => void;
  setBlur: <FieldName extends keyof Values>(args: { name: FieldName }) => void;
  validateField: <FieldName extends keyof Values>(args: {
    name: FieldName;
    value?: Values[FieldName];
  }) => Promise<FieldValidation>;
  validateAllFields: () => Promise<Validation<Values>>;
  handleSubmit: (e?: any) => void;
  submitForm: () => Promise<any>;
  handleReset: (e?: any) => void;
  resetForm: (newState?: {
    values?: Partial<Values>;
    validation?: Partial<Validation<Values>>;
    isSubmitting?: boolean;
    submitCount?: number;
  }) => void;
  setValues: (args: {
    values: Partial<Values>;
    shouldValidate?: boolean;
  }) => void;
  setValidation: (args: { validation: Partial<Validation<Values>> }) => void;
};

function deepObjectSome(
  obj: Record<string, any>,
  cb: (key: string, value: any) => boolean
): boolean {
  let result = false;
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (typeof v === 'object') {
      result = deepObjectSome(v, cb);
    } else {
      result = cb(key, v);
      if (result === true) return result;
    }
  }
  return result;
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined'
    ? React.useLayoutEffect
    : React.useEffect;

function useEventCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref: any = React.useRef(fn);

  // we copy a ref to the callback scoped to the current state/props on each render
  useIsomorphicLayoutEffect(() => {
    ref.current = fn;
  });

  return React.useCallback(
    (...args: any[]) => ref.current.apply(void 0, args),
    []
  ) as T;
}

function createFieldStates<Values, FieldName extends keyof Values>(
  fieldNames: FieldName[],
  state: State<Values>,
  cb: (
    name: FieldName,
    state: State<Values>[FieldName]
  ) => State<Values>[FieldName]
) {
  const fieldStates: any = {};
  for (let i = 0; i <= fieldNames.length; i++) {
    const name = fieldNames[i];
    fieldStates[name] = cb(name, state[name]);
  }
  return fieldStates;
}

export function createForm<Values>({
  initialValues,
}: {
  initialValues: Values;
}) {
  const fieldContexts: any = {};
  const initialFieldState = {} as FieldState<Values>;
  for (const [name, value] of Object.entries<any>(initialValues)) {
    const context = React.createContext({});
    context.displayName = `${name}`;
    (fieldContexts as any)[name] = context;
    (initialFieldState as any)[name] = {
      value,
    };
  }

  const getFieldNames = () => Object.keys(initialValues);

  const actionsContext = React.createContext<FormActions<Values>>(
    {} as FormActions<Values>
  );
  actionsContext.displayName = 'ReactNerdActions';
  const isSubmittingContext = React.createContext<boolean>(false);
  isSubmittingContext.displayName = 'ReactNerdIsSubmitting';
  const submitCountContext = React.createContext<number>(0);
  submitCountContext.displayName = 'ReactNerdSubmitCount';
  const registerContext = React.createContext<RegisterFn<keyof Values>>(
    () => {}
  );
  registerContext.displayName = 'ReactNerdRegister';
  const stateContext = React.createContext<State<Values>>({} as State<Values>);
  stateContext.displayName = 'ReactNerdState';
  const initialValuesContext = React.createContext(initialValues);
  initialValuesContext.displayName = 'ReactNerdInitialValues';
  const calculateIsValidContext = React.createContext(calculateIsValid);
  calculateIsValidContext.displayName = 'ReactNerdCalculateIsValid';

  function createValues(state: State<Values>) {
    const values: Values = {} as Values;
    for (const name of getFieldNames()) {
      values[name as keyof Values] = (state as any)[name].value;
    }
    return values;
  }

  function createValidation(state: State<Values>) {
    const validation: Validation<Values> = {} as Validation<Values>;
    for (const name of getFieldNames()) {
      const v = (state as any)[name].validation;
      if (typeof v !== 'undefined') {
        validation[name as keyof Validation<Values>] = v;
      }
    }
    return validation;
  }

  function calculateIsValid(validation: Validation<Values>) {
    return !deepObjectSome(validation, (_, value) => value === false);
  }

  function FormProvider({
    children,
    onSubmit,
    validateOnChange = true,
    validateOnBlur = true,
    validateOnMount = false,
  }: FormProviderProps<Values>) {
    const [state, dispatch] = React.useReducer(
      (state: State<Values>, cb: (state: State<Values>) => State<Values>) => {
        return cb(state);
      },
      {
        ...initialFieldState,
        isSubmitting: false,
        submitCount: 0,
      }
    );

    const validateOnChangeRef = React.useRef(validateOnChange);
    const validateOnBlurRef = React.useRef(validateOnBlur);
    const onSubmitRef = React.useRef(onSubmit);
    const initialValuesRef = React.useRef(initialValues);

    React.useEffect(() => {
      validateOnChangeRef.current = validateOnChange;
      validateOnBlurRef.current = validateOnBlur;
      onSubmitRef.current = onSubmit;
    }, [validateOnChange, validateOnBlur, onSubmit]);

    const fields = React.useRef<any>({});

    const validationRuns = React.useRef<any>({});

    const setFieldValidation = React.useCallback(
      <FieldName extends keyof Values>({
        name,
        validation,
      }: {
        name: FieldName;
        validation: FieldValidation;
      }) => {
        dispatch(s =>
          deepEqual(s[name].validation, validation)
            ? s
            : {
                ...s,
                [name]: { ...s[name], validation },
              }
        );
      },
      []
    );

    const runFieldValidateFn = async <FieldName extends keyof Values>({
      name,
      value,
    }: {
      name: FieldName;
      value: Values[FieldName];
    }) => {
      try {
        if (typeof fields.current[name]?.beforeValidate === 'function') {
          fields.current[name].beforeValidate(value);
        }
        const result = await fields.current[name].validate(value);
        if (typeof fields.current[name]?.afterValidate === 'function') {
          fields.current[name].afterValidate(value);
        }
        return result;
      } catch (err) {
        console.error(
          `[ReactNerd] Error caught while calling validate function of field: "${name}"`
        );
        console.error(err);
      }
    };

    const validateField = useEventCallback(
      async <FieldName extends keyof Values>({
        name,
        value = (state as any)[name].value,
      }: {
        name: FieldName;
        value?: Values[FieldName];
      }) => {
        if (typeof fields.current[name]?.validate === 'function') {
          const id = {};
          validationRuns.current[name] = id;
          const validation = await runFieldValidateFn({
            name,
            value,
          });
          // if it is not equal, means it's been cancelled
          if (validationRuns.current[name] !== id) return;
          setFieldValidation({ name, validation });
          return validation;
        }
      }
    );

    // const { 1: startTransition } = React.useTransition();

    const setFieldValue = useEventCallback(
      <FieldName extends keyof Values>({
        name,
        setValue,
        shouldValidate = true,
      }: {
        name: FieldName;
        setValue: (
          value: State<Values>[FieldName]['value']
        ) => Values[FieldName];
        shouldValidate?: boolean;
      }) => {
        const newValue = setValue(state[name].value);
        dispatch(s => ({
          ...s,
          [name]: { ...s[name], value: newValue },
        }));
        const willValidate =
          shouldValidate === undefined
            ? validateOnChangeRef.current
            : shouldValidate;
        if (willValidate) {
          validateField({ name, value: newValue });
        }
      }
    );

    const setBlur = React.useCallback(
      <FieldName extends keyof Values>({ name }: { name: FieldName }) => {
        if (validateOnBlurRef.current) {
          validateField({
            name,
          });
        }
      },
      [validateField]
    );

    const validateAllFields = useEventCallback(async () => {
      const fieldKeysWithValidateFn = Object.keys(fields.current).filter(
        name => typeof fields.current[name]?.validate === 'function'
      );
      const promises: Promise<any>[] = fieldKeysWithValidateFn.map(name =>
        fields.current[name].validate((state as any)[name].value)
      );
      try {
        const validationResultsArray = await Promise.all(promises);
        const validation: any = {};
        for (let i = 0; i++; i < fieldKeysWithValidateFn.length) {
          validation[fieldKeysWithValidateFn[i]] = validationResultsArray[i];
        }
        dispatch(s => {
          return {
            ...s,
            ...createFieldStates(
              Object.keys(validation) as any,
              s,
              (name, fs) => {
                if (!deepEqual(fs.validation, validation[name])) {
                  return {
                    ...fs,
                    validation: validation[name],
                  };
                }
                return fs;
              }
            ),
          };
        });
        return validation;
      } catch (err) {
        console.error(
          `[ReactNerd] Error caught in a validate function while calling validateAllFields"`
        );
        console.error(err);
      }
    });

    React.useEffect(() => {
      if (validateOnMount) {
        validateAllFields();
      }
    }, [validateOnMount, validateAllFields]);

    const submitForm = useEventCallback(async () => {
      dispatch(s => ({
        ...s,
        isSubmitting: true,
        submitCount: s.submitCount + 1,
      }));
      const validation = await validateAllFields();
      const isValid = calculateIsValid(validation);
      if (isValid) {
        try {
          return onSubmitRef.current(createValues(state));
        } catch (err) {
          console.error(
            `[ReactNerd] Error caught while calling the onSubmit callback`
          );
          console.error(err);
        } finally {
          dispatch(s => ({
            ...s,
            isSubmitting: false,
          }));
        }
      }
      dispatch(s => ({
        ...s,
        isSubmitting: false,
      }));
    });

    const handleSubmit = React.useCallback(
      (e?: any) => {
        if (e && e.preventDefault && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        if (e && e.stopPropagation && typeof e.stopPropagation === 'function') {
          e.stopPropagation();
        }
        submitForm();
      },
      [submitForm]
    );

    const resetForm = React.useCallback(
      (newState?: {
        values?: Partial<Values>;
        validation?: Partial<Validation<Values>>;
        isSubmitting?: boolean;
        submitCount?: number;
      }) => {
        const newFieldsState: any = {};
        const newValues: any = {};
        for (const name of getFieldNames()) {
          const value =
            newState?.values && name in newState.values
              ? (newState.values as any)[name]
              : (initialValuesRef.current as any)[name];
          const validation =
            newState?.validation && name in newState.validation
              ? (newState.validation as any)[name]
              : undefined;
          newFieldsState[name] = {
            value,
            validation,
          };
          newValues[name] = value;
        }
        initialValuesRef.current = newValues;
        dispatch(s => ({
          ...s,
          ...newFieldsState,
          submitCount:
            typeof newState?.submitCount === 'number'
              ? newState.submitCount
              : 0,
          isSubmitting: !!newState?.isSubmitting,
        }));
      },
      []
    );

    const handleReset = React.useCallback(
      (e?: any) => {
        if (e && e.preventDefault && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        if (e && e.stopPropagation && typeof e.stopPropagation === 'function') {
          e.stopPropagation();
        }
        resetForm();
      },
      [resetForm]
    );

    const setValues = React.useCallback(
      ({
        values,
        shouldValidate,
      }: {
        values: Partial<Values>;
        shouldValidate?: boolean;
      }) => {
        dispatch(s => {
          return {
            ...s,
            ...createFieldStates(Object.keys(values) as any, s, (name, fs) => ({
              ...fs,
              value: values[name],
            })),
          };
        });
        const willValidate =
          shouldValidate === undefined
            ? validateOnChangeRef.current
            : shouldValidate;
        if (willValidate) {
          validateAllFields();
        }
      },
      [validateAllFields]
    );

    const setValidation = React.useCallback(
      ({ validation }: { validation: Partial<Validation<Values>> }) => {
        dispatch(s => {
          return {
            ...s,
            ...createFieldStates(
              Object.keys(validation) as any,
              s,
              (name, fs) => ({
                ...fs,
                validation: validation[name],
              })
            ),
          };
        });
      },
      []
    );

    const register = React.useCallback(
      <FieldName extends keyof Values>(name: FieldName, reg: any) => {
        fields.current[name] = reg;
      },
      []
    );

    const actions = React.useMemo(
      () => ({
        setFieldValue,
        setFieldValidation,
        setBlur,
        validateField,
        validateAllFields,
        handleSubmit,
        submitForm,
        handleReset,
        resetForm,
        setValues,
        setValidation,
      }),
      [
        setFieldValue,
        setFieldValidation,
        setBlur,
        validateField,
        validateAllFields,
        handleSubmit,
        submitForm,
        handleReset,
        resetForm,
        setValues,
        setValidation,
      ]
    );

    function buildFieldProviderTree(children: React.ReactNode) {
      const entries: any = Object.entries(fieldContexts);
      let tree = children;
      for (let i = entries.length - 1; i >= 0; i--) {
        tree = React.createElement(
          entries[i][1].Provider,
          {
            value: state[entries[i][0] as keyof Values],
          },
          tree
        );
      }
      return tree;
    }

    return (
      <stateContext.Provider value={state}>
        <initialValuesContext.Provider value={initialValuesRef.current}>
          <registerContext.Provider value={register}>
            <actionsContext.Provider value={actions}>
              <isSubmittingContext.Provider value={state.isSubmitting}>
                <submitCountContext.Provider value={state.submitCount}>
                  {buildFieldProviderTree(children)}
                </submitCountContext.Provider>
              </isSubmittingContext.Provider>
            </actionsContext.Provider>
          </registerContext.Provider>
        </initialValuesContext.Provider>
      </stateContext.Provider>
    );
  }

  function useField<FieldName extends keyof Values, ValidateFnReturnType>({
    name,
    beforeValidate,
    validate,
    afterValidate,
  }: FieldProps<FieldName, Values, ValidateFnReturnType>) {
    if (!(name in fieldContexts)) {
      console.error(
        `[ReactNerd] You called useField with name: "${name}" which wasn't defined in initialValues`
      );
    }
    const state = React.useContext<FieldState<Values>[FieldName]>(
      fieldContexts[name] ?? {}
    );
    const { setFieldValue, setBlur } = useFormActions();
    const register = React.useContext(registerContext);

    const setValue = React.useCallback(
      (value: Values[FieldName]) => {
        setFieldValue({
          name,
          setValue: () => value,
        });
      },
      [name, setFieldValue]
    );

    const onBlur = React.useCallback(() => setBlur({ name }), [name, setBlur]);

    React.useEffect(() => {
      register(name, { validate, beforeValidate, afterValidate });
    }, [register, name, validate, beforeValidate, afterValidate]);

    const { value, validation } = state;

    return {
      value,
      validation: validation as
        | (ValidateFnReturnType extends Promise<any>
            ? Unwrap<ValidateFnReturnType>
            : ValidateFnReturnType)
        | undefined,
      setValue,
      onBlur,
    };
  }

  function useFieldState<FieldName extends keyof Values>(name: FieldName) {
    if (!(name in initialValues)) {
      console.error(
        `[ReactNerd] You called useFieldState with name: "${name}" which wasn't defined in initialValues`
      );
    }
    return React.useContext<FieldState<Values>[FieldName]>(
      fieldContexts[name] ?? {}
    );
  }

  function useFormActions() {
    return React.useContext(actionsContext);
  }

  function useValues() {
    const state = React.useContext(stateContext);

    return React.useMemo(() => createValues(state), [state]);
  }

  function useValidation() {
    const state = React.useContext(stateContext);

    return React.useMemo(() => createValidation(state), [state]);
  }

  function useInitialValues() {
    return React.useContext(initialValuesContext);
  }

  function useIsDirty() {
    const initialValues = useInitialValues();
    const values = useValues();

    return React.useMemo(() => !deepEqual(initialValues, values), [
      initialValues,
      values,
    ]);
  }

  function useIsValid() {
    const validation = useValidation();

    return React.useMemo(() => calculateIsValid(validation), [validation]);
  }

  function useIsSubmitting() {
    return React.useContext(isSubmittingContext);
  }

  function useSubmitCount() {
    return React.useContext(submitCountContext);
  }

  return {
    FormProvider,
    useField,
    useFieldState,
    useFormActions,
    useValues,
    useValidation,
    useIsDirty,
    useIsValid,
    useIsSubmitting,
    useSubmitCount,
  };
}

export function prepend<E>(array: E[], newElement: E): E[] {
  return [newElement, ...array];
}

export function append<E>(array: E[], newElement: E): E[] {
  return [...array, newElement];
}

export function remove<E>(array: E[], index: number): E[] {
  const copy = [...array];
  copy.splice(index, 1);
  return copy;
}

export function replace<E>(array: E[], index: number, newElement: E): E[] {
  const copy = [...array];
  copy[index] = newElement;
  return copy;
}

export function insert<E>(array: E[], index: number, newElement: E): E[] {
  const copy = [...array];
  copy.splice(index, 0, newElement);
  return copy;
}

export function swap<E>(array: E[], indexA: number, indexB: number): E[] {
  const copy = [...array];
  const a = copy[indexA];
  copy[indexA] = copy[indexB];
  copy[indexB] = a;
  return copy;
}

export function move<E>(array: E[], from: number, to: number): E[] {
  const copy = [...array];
  const value = copy[from];
  copy.splice(from, 1);
  copy.splice(to, 0, value);
  return copy;
}
