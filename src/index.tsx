import * as React from 'react';
import deepEqual from 'fast-deep-equal';

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
  runFieldValidateFn: <FieldName extends keyof Values>(args: {
    name: FieldName;
    value: Values[FieldName];
  }) => Promise<FieldValidation>;
  validateField: <FieldName extends keyof Values>(args: {
    name: FieldName;
    value: Values[FieldName];
  }) => Promise<FieldValidation>;
  validateAllFields: () => Promise<Validation<Values>>;
  handleSubmit: (e: any) => void;
  handleReset: (e: any) => void;
  submitForm: () => void;
  resetForm: (newState?: {
    values?: Partial<Values>;
    validation?: Partial<Validation<Values>>;
    isSubmitting?: boolean;
    submitCount?: number;
  }) => void;
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

export function createForm<Values>({
  initialValues,
}: {
  initialValues: Values;
}) {
  const [fieldContexts, initialFieldState] = Object.entries(
    initialValues
  ).reduce(
    (p, [name, value]) => {
      const context = React.createContext({});
      context.displayName = `${name}`;
      p[0][name] = context;
      p[1][name] = {
        value,
      };
      return p;
    },
    [{}, {}] as any
  );

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

  const stub = () => {};

  function createValues(state: State<Values>) {
    const values: Values = {} as Values;
    for (const name of Object.keys(initialValues)) {
      values[name as keyof Values] = (state as any)[name].value;
    }
    return values;
  }

  function createValidation(state: State<Values>) {
    const validation: Validation<Values> = {} as Validation<Values>;
    for (const name of Object.keys(initialValues)) {
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
    const [[state, effect], dispatch] = React.useReducer(
      (
        [state]: [State<Values>, (state: State<Values>) => void],
        cb: (
          state: State<Values>
        ) => [State<Values>, (state: State<Values>) => void]
      ) => {
        return cb(state);
      },
      [
        {
          ...initialFieldState,
          isSubmitting: false,
          submitCount: 0,
        },
        stub,
      ]
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

    const newestState = React.useRef<State<Values>>(state);

    const fields = React.useRef<any>({});

    const validationRuns = React.useRef<any>({});

    React.useEffect(() => {
      newestState.current = state;
      if (typeof effect === 'function') effect(state);
    }, [state, effect]);

    React.useEffect(() => {
      if (validateOnMount) {
        actions.current.validateAllFields();
      }
    }, [validateOnMount]);

    const actions: React.MutableRefObject<FormActions<Values>> = React.useRef<
      FormActions<Values>
    >({
      setFieldValue: ({ name, setValue, shouldValidate = true }) => {
        dispatch(s => [
          {
            ...s,
            [name]: { ...s[name], value: setValue(s[name].value) },
          },
          s => {
            const willValidate =
              shouldValidate === undefined
                ? validateOnChangeRef.current
                : shouldValidate;
            if (willValidate) {
              actions.current.validateField({
                name,
                value: (s as any)[name].value,
              });
            }
          },
        ]);
      },
      setFieldValidation: ({ name, validation }) => {
        dispatch(s => [
          deepEqual(s[name].validation, validation)
            ? s
            : {
                ...s,
                [name]: { ...s[name], validation },
              },
          stub,
        ]);
      },
      setBlur: ({ name }) => {
        if (validateOnBlurRef.current) {
          actions.current.validateField({
            name,
            value: (newestState.current as any)[name].value,
          });
        }
      },
      runFieldValidateFn: async ({ name, value }) => {
        try {
          if (typeof fields.current[name].beforeValidate === 'function') {
            fields.current[name].beforeValidate(value);
          }
          const result = await fields.current[name].validate(value);
          if (typeof fields.current[name].afterValidate === 'function') {
            fields.current[name].afterValidate(value);
          }
          return result;
        } catch (err) {
          console.error(
            `[ReactNerd] Error caught while calling validate function of field: "${name}"`
          );
          console.error(err);
        }
      },
      validateField: async ({ name, value }) => {
        if (typeof fields.current[name].validate === 'function') {
          const id = {};
          validationRuns.current[name] = id;
          const validation = await actions.current.runFieldValidateFn({
            name,
            value,
          });
          // if it is not equal, means it's been cancelled
          if (validationRuns.current[name] !== id) return;
          actions.current.setFieldValidation({ name, validation });
          return validation;
        }
      },
      validateAllFields: async () => {
        const fieldKeysWithValidateFn = Object.keys(fields.current).filter(
          name => typeof fields.current[name].validate === 'function'
        );
        const promises: Promise<any>[] = fieldKeysWithValidateFn.map(name =>
          fields.current[name].validate(
            (newestState.current as any)[name].value
          )
        );
        const validationResultsArray = await Promise.all(promises);
        const validation = fieldKeysWithValidateFn.reduce((p, name, i) => {
          const v = validationResultsArray[i];
          p[name] = v;
          return p;
        }, {} as any);
        dispatch(s => {
          const fieldModels = Object.keys(validation).reduce((p, name) => {
            const currentFieldState = (s as any)[name];
            if (!deepEqual(currentFieldState.validation, validation[name])) {
              p[name] = {
                ...currentFieldState,
                validation: validation[name],
              };
            }
            return p;
          }, {} as any);
          return [
            {
              ...s,
              ...fieldModels,
            },
            stub,
          ];
        });
        return validation;
      },
      handleSubmit: e => {
        if (e && e.preventDefault && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        if (e && e.stopPropagation && typeof e.stopPropagation === 'function') {
          e.stopPropagation();
        }
        actions.current.submitForm();
      },
      handleReset: e => {
        if (e && e.preventDefault && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        if (e && e.stopPropagation && typeof e.stopPropagation === 'function') {
          e.stopPropagation();
        }
        actions.current.resetForm();
      },
      submitForm: async () => {
        dispatch(s => [
          {
            ...s,
            isSubmitting: true,
            submitCount: s.submitCount + 1,
          },
          stub,
        ]);
        const validation = await actions.current.validateAllFields();
        const isValid = calculateIsValid(validation);
        if (isValid) {
          try {
            return onSubmitRef.current(
              createValues(newestState.current) as Values
            );
          } catch (err) {
            console.error(
              `[ReactNerd] Error caught while calling the onSubmit callback`
            );
            console.error(err);
          } finally {
            dispatch(s => [
              {
                ...s,
                isSubmitting: false,
              },
              stub,
            ]);
          }
        }
        dispatch(s => [
          {
            ...s,
            isSubmitting: false,
          },
          stub,
        ]);
      },
      resetForm: newState => {
        const [newFieldsState, newValues] = Object.keys(initialValues).reduce(
          ([s, v], name) => {
            const value =
              newState?.values && name in newState.values
                ? (newState.values as any)[name]
                : (initialValuesRef.current as any)[name];
            const validation =
              newState?.validation && name in newState.validation
                ? (newState.validation as any)[name]
                : undefined;
            s[name] = {
              value,
              validation,
            };
            v[name] = value;
            return [s, v];
          },
          [{}, {}] as any
        );
        initialValuesRef.current = newValues;
        dispatch(s => [
          {
            ...s,
            ...newFieldsState,
            submitCount:
              typeof newState?.submitCount === 'number'
                ? newState.submitCount
                : 0,
            isSubmitting: !!newState?.isSubmitting,
          },
          stub,
        ]);
      },
    });

    function buildFieldProviderTree(children: React.ReactNode) {
      return Object.entries<any>(fieldContexts).reduceRight(
        (tree, [name, context]) => {
          tree = React.createElement(
            context.Provider,
            {
              value: state[name as keyof Values],
            },
            tree
          );
          return tree;
        },
        children
      );
    }

    const register = React.useCallback(
      <FieldName extends keyof Values>(name: FieldName, reg: any) => {
        fields.current[name] = reg;
      },
      []
    );

    return (
      <stateContext.Provider value={state}>
        <initialValuesContext.Provider value={initialValuesRef.current}>
          <registerContext.Provider value={register}>
            <actionsContext.Provider value={actions.current}>
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

export const prepend = (array: any[], newElement: any) => {
  return [newElement, ...array];
};

export const append = (array: any[], newElement: any) => {
  return [...array, newElement];
};

export const remove = (array: any[], index: number) => {
  const copy = [...array];
  copy.splice(index, 1);
  return copy;
};

export const replace = (array: any[], index: number, newElement: any) => {
  const copy = [...array];
  copy[index] = newElement;
  return copy;
};

export const insert = (array: any[], index: number, newElement: any) => {
  const copy = [...array];
  copy.splice(index, 0, newElement);
  return copy;
};

export const swap = (array: any[], indexA: number, indexB: number) => {
  const copy = [...array];
  const a = copy[indexA];
  copy[indexA] = copy[indexB];
  copy[indexB] = a;
  return copy;
};

export const move = (array: any[], from: number, to: number) => {
  const copy = [...array];
  const value = copy[from];
  copy.splice(from, 1);
  copy.splice(to, 0, value);
  return copy;
};
