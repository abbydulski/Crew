import Spinner from '@/components/Spinner';

export default function PageLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size={32} />
    </div>
  );
}
