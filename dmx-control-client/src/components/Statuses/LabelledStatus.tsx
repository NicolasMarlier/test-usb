import './LabelledStatus.scss'

interface Props {
    label: string
    status: 'Green' | 'Orange' | 'Red'
}
const LabelledStatus = (props: Props) => {
    const { label, status } = props;

    return <div className='labelled-status'>
        <div className={`signal ${status}`}/>
        <div className='label'>{label}</div>
    </div>
}

export default LabelledStatus