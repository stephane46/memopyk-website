import { useForm, UseFormProps, FieldValues, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';
import { useToast } from './use-toast';

interface UseFormValidationProps<T extends FieldValues> extends UseFormProps<T> {
  schema: ZodSchema<T>;
  onSubmitSuccess?: (data: T) => void;
  onSubmitError?: (error: any) => void;
  successMessage?: string;
  errorMessage?: string;
}

export const useFormValidation = <T extends FieldValues>({
  schema,
  onSubmitSuccess,
  onSubmitError,
  successMessage = 'Form submitted successfully',
  errorMessage = 'An error occurred while submitting the form',
  ...formProps
}: UseFormValidationProps<T>) => {
  const { toast } = useToast();
  
  const form = useForm<T>({
    resolver: zodResolver(schema),
    ...formProps,
  });

  const handleSubmit = form.handleSubmit(
    async (data) => {
      try {
        await onSubmitSuccess?.(data);
        toast({
          title: 'Success',
          description: successMessage,
        });
      } catch (error) {
        console.error('Form submission error:', error);
        onSubmitError?.(error);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
    (errors) => {
      console.error('Form validation errors:', errors);
      toast({
        title: 'Validation Error',
        description: 'Please check the form for errors and try again.',
        variant: 'destructive',
      });
    }
  );

  // Helper to get field error message
  const getFieldError = (fieldName: Path<T>) => {
    const error = form.formState.errors[fieldName];
    return error?.message as string | undefined;
  };

  // Helper to check if field has error
  const hasFieldError = (fieldName: Path<T>) => {
    return !!form.formState.errors[fieldName];
  };

  return {
    form,
    handleSubmit,
    getFieldError,
    hasFieldError,
    isSubmitting: form.formState.isSubmitting,
    isDirty: form.formState.isDirty,
    isValid: form.formState.isValid,
  };
};