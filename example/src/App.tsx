import React from 'react';
import { useMemo } from 'react';
import { createForm } from 'react-nerd';

const fieldKeys = Array(500)
  .fill(0)
  .map((_, i) => `field${i}`);

const initialValues = fieldKeys.reduce((p, c) => {
  p[c] = '';
  return p;
}, {} as any);

const { FormProvider, useField } = createForm({
  initialValues,
});

const Field = ({ name }: { name: string }) => {
  const { value, setValue } = useField({
    name,
  });

  return (
    <input type="text" value={value} onChange={e => setValue(e.target.value)} />
  );
};

function App() {
  return (
    <FormProvider onSubmit={() => {}}>
      <div>
        <h1>react-nerd stress test</h1>
        <div>500 controlled fields! 🤯</div>
        <br />
        <div>Check out the component tree in react devtools. It's yuuuge!</div>
        <br />
        <div>
          Open the performance tab and simulate 6x CPU slowdown. The form is
          still usable!
        </div>
        <br />
      </div>
      <form>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 15,
          }}
        >
          {fieldKeys.map(key => (
            <Field key={key} name={key} />
          ))}
        </div>
      </form>
    </FormProvider>
  );
}

export default App;
